import { Router, type IRouter } from "express";
import { odooAuthenticate, odooCall } from "../lib/odoo";
import { signToken } from "../lib/jwt";
import { requireAuth } from "../middlewares/auth";
import { pool } from "@workspace/db";
import { createHash } from "node:crypto";

const router: IRouter = Router();

async function ensureUserLocalAuthColumns() {
  try {
    await pool.query(`
      ALTER TABLE db_users
      ADD COLUMN IF NOT EXISTS apellidos varchar(255),
      ADD COLUMN IF NOT EXISTS telefono varchar(50),
      ADD COLUMN IF NOT EXISTS password_hash text
    `);
  } catch {
    // En algunos entornos el usuario de BD no es owner de la tabla.
    // Continuamos y haremos fallback si no existe password_hash.
  }
}

async function hasPasswordHashColumn(): Promise<boolean> {
  return hasColumn("password_hash");
}

async function hasColumn(columnName: string): Promise<boolean> {
  const result = await pool.query(
    `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'db_users'
        AND column_name = $1
    ) AS ok
    `,
    [columnName],
  );
  return Boolean(result.rows[0]?.ok);
}

function buildDeterministicLocalUid(username: string, passwordHash: string): number {
  const raw = createHash("sha256").update(`${username}:${passwordHash}`).digest("hex").slice(0, 8);
  const asInt = Number.parseInt(raw, 16);
  const bounded = (asInt % 2_000_000_000) + 1;
  return -bounded;
}

function determineRole(uid: number, groups: string[]): string {
  if (groups.some((g) => g.includes("Administrator") || g.includes("Administrador"))) {
    return "administrador";
  }
  if (groups.some((g) => g.includes("Accountant") || g.includes("Contable") || g.includes("Finance"))) {
    return "contable";
  }
  if (groups.some((g) => g.includes("Manager") || g.includes("Directivo") || g.includes("Director"))) {
    return "directivo";
  }
  if (groups.some((g) => g.includes("Delegado") || g.includes("Delegate"))) {
    return "delegado";
  }
  if (uid > 0) {
    return "socio";
  }
  return "usuario";
}

function splitName(fullName: string): { nombre: string; apellidos: string } {
  const normalized = String(fullName ?? "").trim().replace(/\s+/g, " ");
  if (!normalized) return { nombre: "", apellidos: "" };
  const firstSpace = normalized.indexOf(" ");
  if (firstSpace < 0) return { nombre: normalized, apellidos: "" };
  return {
    nombre: normalized.slice(0, firstSpace).trim(),
    apellidos: normalized.slice(firstSpace + 1).trim(),
  };
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const { username, password } = req.body ?? {};

  if (!username || !password) {
    res.status(400).json({ error: "Usuario y contraseña son obligatorios" });
    return;
  }

  await ensureUserLocalAuthColumns();

  const requestedUsername = String(username).trim();
  const localPasswordHash = createHash("sha256").update(String(password ?? "")).digest("hex");
  try {
    const canCheckLocalPassword = await hasPasswordHashColumn();
    const local = canCheckLocalPassword
      ? await pool.query(
          `
          SELECT id, odoo_uid, username, nombre, email, rol, avatar_url
          FROM db_users
          WHERE username = $1 AND password_hash = $2
          ORDER BY updated_at DESC NULLS LAST, id DESC
          LIMIT 1
          `,
          [requestedUsername, localPasswordHash],
        )
      : await pool.query(
          `
          SELECT id, odoo_uid, username, nombre, email, rol, avatar_url
          FROM db_users
          WHERE username = $1 AND odoo_uid = $2
          ORDER BY updated_at DESC NULLS LAST, id DESC
          LIMIT 1
          `,
          [requestedUsername, buildDeterministicLocalUid(requestedUsername, localPasswordHash)],
        );
    if (local.rows.length > 0) {
      const row = local.rows[0];
      // En login local también mantenemos completos los datos en db_users.
      try {
        const hasApellidos = await hasColumn("apellidos");
        const hasTelefono = await hasColumn("telefono");
        const hasPasswordHash = await hasColumn("password_hash");
        const nombreLocal = String(row.nombre ?? "").trim();
        const emailLocal = String(row.email ?? "").trim();
        const parts = splitName(nombreLocal);
        let telefonoLocal = "";
        if (hasTelefono && emailLocal) {
          try {
            const telFallback = await pool.query(
              `
              SELECT telefono
              FROM db_socios
              WHERE lower(trim(email)) = lower(trim($1))
              ORDER BY updated_at DESC NULLS LAST, id DESC
              LIMIT 1
              `,
              [emailLocal],
            );
            telefonoLocal = String(telFallback.rows[0]?.telefono ?? "").trim();
          } catch {
            telefonoLocal = "";
          }
        }

        const setClauses = ["updated_at = now()"];
        const values: Array<string | number | null> = [];
        if (hasApellidos) {
          setClauses.push(`apellidos = COALESCE(NULLIF(apellidos, ''), $${values.length + 1})`);
          values.push(parts.apellidos || null);
        }
        if (hasTelefono) {
          setClauses.push(`telefono = COALESCE(NULLIF(telefono, ''), $${values.length + 1})`);
          values.push(telefonoLocal || null);
        }
        if (hasPasswordHash) {
          setClauses.push(`password_hash = $${values.length + 1}`);
          values.push(localPasswordHash);
        }
        values.push(Number(row.id ?? 0));
        await pool.query(
          `
          UPDATE db_users
          SET ${setClauses.join(", ")}
          WHERE id = $${values.length}
          `,
          values,
        );
      } catch {
        // No bloqueamos login si falla sincronización local.
      }
      const uidLocal = Number(row.odoo_uid ?? row.id ?? 0) || Number(row.id);
      const token = signToken({
        uid: uidLocal,
        username: String(row.username ?? requestedUsername),
        name: String(row.nombre ?? requestedUsername),
        email: row.email ? String(row.email) : null,
        role: String(row.rol ?? "usuario"),
        groupId: null,
      });
      res.json({
        token,
        user: {
          id: uidLocal,
          username: String(row.username ?? requestedUsername),
          name: String(row.nombre ?? requestedUsername),
          email: row.email ? String(row.email) : null,
          role: String(row.rol ?? "usuario"),
          avatar: row.avatar_url ? String(row.avatar_url) : null,
          groupId: null,
        },
      });
      return;
    }
  } catch {
    // Si falla login local, intentamos Odoo como fallback.
  }

  const uid = await odooAuthenticate(username, password);
  if (!uid) {
    res.status(401).json({ error: "Credenciales inválidas" });
    return;
  }

  let partnerData: Record<string, unknown>[] = [];
  try {
    partnerData = (await odooCall("res.users", "search_read", [
      [["id", "=", uid]],
    ], {
      fields: ["name", "email", "partner_id", "groups_id"],
      limit: 1,
    })) as Record<string, unknown>[];
  } catch {
    partnerData = [];
  }

  const user = partnerData[0] ?? {};
  const groupIds = (user.groups_id as number[]) ?? [];

  let groupNames: string[] = [];
  if (groupIds.length > 0) {
    try {
      const groups = (await odooCall("res.groups", "search_read", [
        [["id", "in", groupIds]],
      ], {
        fields: ["full_name"],
      })) as Record<string, unknown>[];
      groupNames = groups.map((g) => String(g.full_name ?? ""));
    } catch {
      groupNames = [];
    }
  }

  const role = determineRole(uid, groupNames);
  const fullName = String(user.name ?? username).trim();
  const { nombre, apellidos } = splitName(fullName);
  const email = user.email ? String(user.email).trim() : "";

  // Sincronizamos login Odoo en db_users para mantener datos de acceso completos.
  try {
    const hasApellidos = await hasColumn("apellidos");
    const hasTelefono = await hasColumn("telefono");
    const hasPasswordHash = await hasColumn("password_hash");

    let telefonoValue = "";
    try {
      const fallback = await pool.query(
        `
        SELECT
          COALESCE(NULLIF(u.telefono, ''), NULLIF(s.telefono, '')) AS telefono
        FROM db_users u
        LEFT JOIN db_socios s ON lower(trim(s.email)) = lower(trim(u.email))
        WHERE u.odoo_uid = $1 OR u.username = $2
        ORDER BY u.updated_at DESC NULLS LAST, u.id DESC
        LIMIT 1
        `,
        [uid, requestedUsername],
      );
      telefonoValue = String(fallback.rows[0]?.telefono ?? "").trim();
    } catch {
      telefonoValue = "";
    }

    const existing = await pool.query(
      `
      SELECT id
      FROM db_users
      WHERE odoo_uid = $1 OR username = $2
      ORDER BY updated_at DESC NULLS LAST, id DESC
      LIMIT 1
      `,
      [uid, requestedUsername],
    );

    if (existing.rows.length > 0) {
      const setClauses = [
        "odoo_uid = $1",
        "username = $2",
        "nombre = $3",
        "email = $4",
        "rol = $5",
        "updated_at = now()",
      ];
      const values: Array<string | number | null> = [uid, requestedUsername, nombre || requestedUsername, email || null, role];
      if (hasApellidos) {
        setClauses.push(`apellidos = $${values.length + 1}`);
        values.push(apellidos || null);
      }
      if (hasTelefono) {
        setClauses.push(`telefono = $${values.length + 1}`);
        values.push(telefonoValue || null);
      }
      if (hasPasswordHash) {
        setClauses.push(`password_hash = $${values.length + 1}`);
        values.push(localPasswordHash);
      }
      values.push(Number(existing.rows[0]?.id ?? 0));
      await pool.query(
        `
        UPDATE db_users
        SET ${setClauses.join(", ")}
        WHERE id = $${values.length}
        `,
        values,
      );
    } else {
      const columns = ["odoo_uid", "socio_id", "username", "nombre", "email", "rol", "avatar_url", "ultimo_acceso", "created_at", "updated_at"];
      const values: Array<string | number | null> = [
        uid,
        null,
        requestedUsername,
        nombre || requestedUsername,
        email || null,
        role,
        null,
        null,
        null,
        null,
      ];
      if (hasApellidos) {
        columns.splice(4, 0, "apellidos");
        values.splice(4, 0, apellidos || null);
      }
      if (hasTelefono) {
        const insertAt = hasApellidos ? 7 : 6;
        columns.splice(insertAt, 0, "telefono");
        values.splice(insertAt, 0, telefonoValue || null);
      }
      if (hasPasswordHash) {
        const insertAt = columns.indexOf("created_at");
        columns.splice(insertAt, 0, "password_hash");
        values.splice(insertAt, 0, localPasswordHash);
      }
      const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
      await pool.query(
        `
        INSERT INTO db_users (
          ${columns.join(", ")}
        ) VALUES (
          ${placeholders}
        )
        `,
        values,
      );
    }
  } catch {
    // No bloqueamos login si falla sincronización local.
  }

  const token = signToken({
    uid,
    username,
    name: String(user.name ?? username),
    email: user.email ? String(user.email) : null,
    role,
    groupId: null,
  });

  res.json({
    token,
    user: {
      id: uid,
      username: String(username),
      name: String(user.name ?? username),
      email: user.email ? String(user.email) : null,
      role,
      avatar: null,
      groupId: null,
    },
  });
});

router.get("/auth/me", requireAuth, (req, res): void => {
  const user = req.user!;
  res.json({
    id: user.uid,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: null,
    groupId: user.groupId,
  });
});

export default router;
