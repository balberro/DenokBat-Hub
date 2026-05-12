import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import { pool } from "@workspace/db";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const router: IRouter = Router();

async function ensureUserProfileColumns() {
  try {
    await pool.query(`
      ALTER TABLE db_users
      ADD COLUMN IF NOT EXISTS apellidos varchar(255),
      ADD COLUMN IF NOT EXISTS telefono varchar(50),
      ADD COLUMN IF NOT EXISTS password_hash text
    `);
  } catch {
    // Puede fallar por permisos de owner; usamos fallback sin alterar esquema.
  }
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

/** Convierte data URL a fichero bajo /uploads/perfil/; deja URLs ya públicas sin cambios. */
async function persistAvatarIfNeeded(value: string | null): Promise<string | null> {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("data:")) return trimmed;

  const match = trimmed.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return trimmed;

  const mime = match[1];
  const base64 = match[2];
  let ext = "bin";
  if (mime === "image/png") ext = "png";
  else if (mime === "image/jpeg" || mime === "image/jpg") ext = "jpg";
  else if (mime === "image/webp") ext = "webp";
  else if (mime === "image/gif") ext = "gif";

  const fileName = `avatar-${Date.now()}-${randomUUID()}.${ext}`;
  const uploadsDir = path.resolve(process.cwd(), "artifacts/api-server/uploads/perfil");
  await mkdir(uploadsDir, { recursive: true });
  const absPath = path.join(uploadsDir, fileName);
  await writeFile(absPath, Buffer.from(base64, "base64"));
  return `/uploads/perfil/${fileName}`;
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

router.get("/perfil/me", requireAuth, async (req, res): Promise<void> => {
  try {
    await ensureUserProfileColumns();
    const hasApellidos = await hasColumn("apellidos");
    const hasTelefono = await hasColumn("telefono");
    const uid = Number(req.user!.uid);
    const username = String(req.user!.username ?? "");
    const result = await pool.query(
      `
      SELECT
        id, odoo_uid, socio_id, username, nombre, ${hasApellidos ? "apellidos" : "NULL::varchar AS apellidos"}, email, ${hasTelefono ? "telefono" : "NULL::varchar AS telefono"},
        rol, avatar_url, ultimo_acceso, created_at, updated_at
      FROM db_users
      WHERE odoo_uid = $1 OR username = $2
      ORDER BY updated_at DESC NULLS LAST, id DESC
      LIMIT 1
      `,
      [uid, username],
    );
    if (!result.rows.length) {
      res.status(404).json({ error: "Perfil de usuario no encontrado" });
      return;
    }
    const row = result.rows[0] as Record<string, unknown>;
    const nombreRaw = String(row.nombre ?? "").trim();
    const apellidosRaw = String(row.apellidos ?? "").trim();
    const split = splitName(nombreRaw);
    let apellidosValue = apellidosRaw || split.apellidos;
    let telefonoValue = String(row.telefono ?? "").trim();
    if (!telefonoValue) {
      try {
        const fallbackSocio = await pool.query(
          `
          SELECT apellidos, telefono
          FROM db_socios
          WHERE email = $1
          ORDER BY updated_at DESC NULLS LAST, id DESC
          LIMIT 1
          `,
          [String(row.email ?? "").trim()],
        );
        telefonoValue = String(fallbackSocio.rows[0]?.telefono ?? "").trim();
        if (!apellidosValue) {
          apellidosValue = String(fallbackSocio.rows[0]?.apellidos ?? "").trim();
        }
      } catch {
        // Si no existe db_socios o falla consulta, no bloqueamos perfil.
      }
    }

    const rawAvatar = row.avatar_url ? String(row.avatar_url).trim() : "";
    if (rawAvatar.startsWith("data:")) {
      try {
        const migrated = await persistAvatarIfNeeded(rawAvatar);
        if (migrated && !migrated.startsWith("data:")) {
          const userId = Number(row.id ?? 0);
          if (userId > 0) {
            await pool.query(`UPDATE db_users SET avatar_url = $1, updated_at = now() WHERE id = $2`, [migrated, userId]);
            row.avatar_url = migrated;
          }
        }
      } catch {
        // Si falla la migración, devolvemos el valor almacenado tal cual.
      }
    }

    res.json({
      ...row,
      nombre: split.nombre || nombreRaw,
      apellidos: apellidosValue,
      telefono: telefonoValue,
    });
  } catch (err) {
    res.status(500).json({ error: "Error cargando perfil", detalle: String(err) });
  }
});

router.put("/perfil/me", requireAuth, async (req, res): Promise<void> => {
  const uid = Number(req.user!.uid);
  const usernameToken = String(req.user!.username ?? "");
  const payload = req.body ?? {};
  const nombre = String(payload.nombre ?? "").trim();
  const apellidos = String(payload.apellidos ?? "").trim();
  const email = String(payload.email ?? "").trim();
  const telefono = String(payload.telefono ?? "").trim();
  const username = String(payload.username ?? "").trim();
  const avatarUrl = typeof payload.avatarUrl === "string" ? payload.avatarUrl : null;
  const password = String(payload.password ?? "");
  const confirmPassword = String(payload.confirmPassword ?? "");

  if (!nombre || !apellidos || !email || !telefono || !username) {
    res.status(400).json({ error: "Nombre, apellidos, email, teléfono y usuario son obligatorios" });
    return;
  }
  if (!password || password.length < 8) {
    res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
    return;
  }
  if (password !== confirmPassword) {
    res.status(400).json({ error: "La confirmación de contraseña no coincide" });
    return;
  }

  try {
    await ensureUserProfileColumns();
    const hasApellidos = await hasColumn("apellidos");
    const hasTelefono = await hasColumn("telefono");
    const hasPasswordHash = await hasColumn("password_hash");
    if (!hasApellidos || !hasTelefono || !hasPasswordHash) {
      res.status(500).json({
        error: "Estructura db_users incompleta. Ejecuta lib/db/fix-db-users-perfil-auth.sql",
      });
      return;
    }
    const existing = await pool.query(
      `
      SELECT id
      FROM db_users
      WHERE username = $1
        AND NOT (odoo_uid = $2 OR username = $3)
      LIMIT 1
      `,
      [username, uid, usernameToken],
    );
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "El usuario ya existe" });
      return;
    }

    const passwordHash = createHash("sha256").update(password).digest("hex");
    const nombreToStore = nombre;
    const avatarStored = await persistAvatarIfNeeded(avatarUrl);
    const setClauses = [
      "username = $1",
      "nombre = $2",
      "apellidos = $3",
      "email = $4",
      "telefono = $5",
      "avatar_url = COALESCE($6, avatar_url)",
      "password_hash = $7",
      "updated_at = now()",
    ];
    const returningSql = `
      id, odoo_uid, socio_id, username, nombre,
      ${hasApellidos ? "apellidos" : "NULL::varchar AS apellidos"},
      email,
      ${hasTelefono ? "telefono" : "NULL::varchar AS telefono"},
      rol, avatar_url, ultimo_acceso, created_at, updated_at
    `;
    const updateValues: Array<string | number | null> = [
      username,
      nombreToStore,
      apellidos,
      email,
      telefono,
      avatarStored,
      passwordHash,
      uid,
      usernameToken,
    ];
    const whereUidParam = updateValues.length - 1;
    const whereUsernameParam = updateValues.length;
    const updated = await pool.query(
      `
      UPDATE db_users
      SET
        ${setClauses.join(", ")}
      WHERE odoo_uid = $${whereUidParam} OR username = $${whereUsernameParam}
      RETURNING
        ${returningSql}
      `,
      updateValues,
    );
    if (!updated.rows.length) {
      res.status(404).json({ error: "Perfil de usuario no encontrado" });
      return;
    }
    // Si existe socio asociado, sincronizamos siempre datos comunes.
    try {
      const [updatedRow] = updated.rows as Array<Record<string, unknown>>;
      const socioId = Number(updatedRow?.socio_id ?? 0) || null;
      if (socioId) {
        await pool.query(
          `
          UPDATE db_socios
          SET
            nombre = $1,
            apellidos = $2,
            email = $3,
            telefono = $4,
            updated_at = now()
          WHERE id = $5
          `,
          [nombre, apellidos, email, telefono, socioId],
        );
      } else {
        await pool.query(
          `
          UPDATE db_socios
          SET
            nombre = $1,
            apellidos = $2,
            telefono = $3,
            updated_at = now()
          WHERE email = $4
          `,
          [nombre, apellidos, telefono, email],
        );
      }
    } catch {
      // No bloqueamos guardado de db_users si falla sincronización con socios.
    }
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error guardando perfil", detalle: String(err) });
  }
});

export default router;
