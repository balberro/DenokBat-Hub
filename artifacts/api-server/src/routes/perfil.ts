import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import { pool } from "@workspace/db";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getUserRoles } from "../lib/roles";
import { odooCall } from "../lib/odoo";
import { loadAsociacionDatos, parseMetodosPagoSolicitudJson, sanitizeSolicitudDatosExtra } from "../lib/asociacionConfig";

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

/** Foto de solicitud de socio: se guarda bajo /uploads/socios (mismo criterio que ficha socio). */
async function persistSolicitudSocioPhoto(value: unknown): Promise<string | null> {
  const raw = value === undefined || value === null ? "" : String(value).trim();
  if (!raw) return null;
  if (!raw.startsWith("data:")) return raw;

  const match = raw.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  const mime = match[1];
  const base64 = match[2];
  let ext = "bin";
  if (mime === "image/png") ext = "png";
  else if (mime === "image/jpeg" || mime === "image/jpg") ext = "jpg";
  else if (mime === "image/webp") ext = "webp";
  else if (mime === "image/gif") ext = "gif";

  const fileName = `solicitud-${Date.now()}-${randomUUID()}.${ext}`;
  const uploadsDir = path.resolve(process.cwd(), "artifacts/api-server/uploads/socios");
  await mkdir(uploadsDir, { recursive: true });
  const absPath = path.join(uploadsDir, fileName);
  await writeFile(absPath, Buffer.from(base64, "base64"));
  return `/uploads/socios/${fileName}`;
}

const MAX_DNI_DOC_BYTES = 8 * 1024 * 1024;

/** PDF o imagen (ambas caras DNI); guardado en uploads/socios/dni/ */
async function persistSolicitudDniDoc(value: unknown, side: "anverso" | "reverso"): Promise<string | null> {
  const raw = value === undefined || value === null ? "" : String(value).trim();
  if (!raw) return null;
  if (!raw.startsWith("data:")) {
    return raw.startsWith("/uploads/") ? raw : null;
  }

  const match = raw.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  const mime = match[1].toLowerCase();
  const base64 = match[2];
  let buf: Buffer;
  try {
    buf = Buffer.from(base64, "base64");
  } catch {
    return null;
  }
  if (buf.length === 0 || buf.length > MAX_DNI_DOC_BYTES) return null;

  let ext = "bin";
  if (mime === "image/png") ext = "png";
  else if (mime === "image/jpeg" || mime === "image/jpg") ext = "jpg";
  else if (mime === "image/webp") ext = "webp";
  else if (mime === "image/gif") ext = "gif";
  else if (mime === "application/pdf") ext = "pdf";
  else return null;

  const fileName = `dni-${side}-${Date.now()}-${randomUUID()}.${ext}`;
  const uploadsDir = path.resolve(process.cwd(), "artifacts/api-server/uploads/socios/dni");
  await mkdir(uploadsDir, { recursive: true });
  const absPath = path.join(uploadsDir, fileName);
  await writeFile(absPath, buf);
  return `/uploads/socios/dni/${fileName}`;
}

async function ensureSocioSolicitudExtraColumns(): Promise<void> {
  try {
    await pool.query(`
      ALTER TABLE db_socios
      ADD COLUMN IF NOT EXISTS dni_doc_anverso_url text,
      ADD COLUMN IF NOT EXISTS dni_doc_reverso_url text,
      ADD COLUMN IF NOT EXISTS solicitud_metodo_pago varchar(50),
      ADD COLUMN IF NOT EXISTS solicitud_cuota_importe numeric(10,2),
      ADD COLUMN IF NOT EXISTS solicitud_revision_campos text,
      ADD COLUMN IF NOT EXISTS solicitud_revision_mensaje text,
      ADD COLUMN IF NOT EXISTS solicitud_datos_extra_json text
    `);
  } catch {
    // Permisos / entorno sin ALTER
  }
}

function parseRevisionCamposRaw(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x ?? "").trim()).filter(Boolean);
  const s = String(raw).trim();
  if (!s) return [];
  try {
    const j = JSON.parse(s) as unknown;
    if (Array.isArray(j)) return j.map((x) => String(x ?? "").trim()).filter(Boolean);
  } catch {
    //
  }
  return [];
}

type MetodoPagoOpt = { id: string; label_es: string; label_eu: string };

const DEFAULT_MEMBERSHIP_SOLICITUD_METODOS: MetodoPagoOpt[] = [
  { id: "transferencia", label_es: "Transferencia bancaria", label_eu: "Banku-transferentzia" },
  { id: "bizum", label_es: "Bizum", label_eu: "Bizum" },
  { id: "domiciliacion", label_es: "Domiciliación bancaria (SEPA)", label_eu: "Helbideratze bancarioa (SEPA)" },
];

function normalizeCuotaKey(s: string): string {
  const n = Number.parseFloat(String(s).replace(",", ".").trim());
  if (!Number.isFinite(n)) return "";
  return n.toFixed(2);
}

/** Acepta AAAA-MM-DD o DD/MM/AAAA (o DD-MM-AAAA) para evitar error SQL con formatos locales. */
function parseFechaNacimientoForSql(raw: string): { ok: true; iso: string } | { ok: false; message: string } {
  const s = String(raw ?? "").trim();
  if (!s) return { ok: false, message: "Indique la fecha de nacimiento." };
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return { ok: true, iso: s };
  }
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    const y = Number(m[3]);
    if (!Number.isFinite(d) || !Number.isFinite(mo) || !Number.isFinite(y) || y < 1900 || y > 2100) {
      return { ok: false, message: "Fecha de nacimiento no válida." };
    }
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return { ok: false, message: "Fecha de nacimiento no válida." };
    const iso = `${String(y).padStart(4, "0")}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return { ok: true, iso };
  }
  return {
    ok: false,
    message: "Use la fecha en formato AAAA-MM-DD o DD/MM/AAAA (por ejemplo 1990-05-12 o 12/05/1990).",
  };
}

function describeSolicitudError(err: unknown): string {
  const parts: string[] = [];
  const visit = (e: unknown, depth: number) => {
    if (depth > 6 || e == null) return;
    if (e instanceof Error) {
      parts.push(e.message);
      const any = e as unknown as Record<string, unknown>;
      if (typeof any.code === "string") parts.push(`pg_code=${any.code}`);
      if (typeof any.detail === "string" && any.detail) parts.push(`pg_detail=${any.detail}`);
      visit(e.cause, depth + 1);
    } else {
      parts.push(String(e));
    }
  };
  visit(err, 0);
  return parts.filter(Boolean).join(" | ");
}

async function loadMembershipSolicitudOptionsFromDb(): Promise<{
  cuota_importe: string;
  metodos_pago: MetodoPagoOpt[];
}> {
  const envCuota = String(process.env.MEMBERSHIP_SOLICITUD_CUOTA ?? "").trim();
  let cuota = normalizeCuotaKey(envCuota || "40.00") || "40.00";
  let metodos: MetodoPagoOpt[] = [...DEFAULT_MEMBERSHIP_SOLICITUD_METODOS];
  let cuotaDesdeAsociacion = false;
  let metodosDesdeAsociacion = false;

  try {
    const asoc = await loadAsociacionDatos();
    const cuotaAsoc = normalizeCuotaKey(asoc.cuotaIngresoSocio);
    if (cuotaAsoc) {
      cuota = cuotaAsoc;
      cuotaDesdeAsociacion = true;
    }
    const metAsoc = parseMetodosPagoSolicitudJson(asoc.metodosPagoSolicitudJson);
    if (metAsoc) {
      metodos = metAsoc;
      metodosDesdeAsociacion = true;
    }
  } catch {
    // db_config ausente o error puntual
  }

  try {
    const r = await pool.query(
      `
      SELECT clave, valor
      FROM db_config
      WHERE clave IN ('membership.solicitud_cuota_importe', 'membership.solicitud_metodos_json')
      `,
    );
    for (const row of r.rows) {
      const clave = String(row.clave ?? "");
      const valor = row.valor != null ? String(row.valor) : "";
      if (
        !cuotaDesdeAsociacion &&
        clave === "membership.solicitud_cuota_importe" &&
        valor.trim()
      ) {
        const norm = normalizeCuotaKey(valor);
        if (norm) cuota = norm;
      }
      if (!metodosDesdeAsociacion && clave === "membership.solicitud_metodos_json" && valor.trim()) {
        try {
          const parsed = JSON.parse(valor) as unknown;
          if (Array.isArray(parsed)) {
            const next: MetodoPagoOpt[] = [];
            for (const item of parsed) {
              if (!item || typeof item !== "object") continue;
              const o = item as Record<string, unknown>;
              const id = String(o.id ?? "").trim();
              if (!id) continue;
              next.push({
                id,
                label_es: String(o.label_es ?? o.labelEs ?? id),
                label_eu: String(o.label_eu ?? o.labelEu ?? o.label_es ?? id),
              });
            }
            if (next.length > 0) metodos = next;
          }
        } catch {
          // JSON inválido: se mantienen métodos por defecto
        }
      }
    }
  } catch {
    // Sin db_config o tabla ausente
  }

  return { cuota_importe: cuota, metodos_pago: metodos };
}

async function loadUserRow(uid: number, username: string): Promise<Record<string, unknown> | null> {
  await ensureUserProfileColumns();
  const hasApellidos = await hasColumn("apellidos");
  const hasTelefono = await hasColumn("telefono");
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
  return result.rows.length ? (result.rows[0] as Record<string, unknown>) : null;
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
    const uid = Number(req.user!.uid);
    const username = String(req.user!.username ?? "");
    const row = await loadUserRow(uid, username);
    if (!row) {
      res.status(404).json({ error: "Perfil de usuario no encontrado" });
      return;
    }
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

    let socio_estado: {
      id: number;
      estado: string;
      revision_campos: string[];
      revision_mensaje: string | null;
      solicitud_prefill?: {
        direccion: string;
        poblacion: string;
        provincia: string;
        dni: string;
        fecha_nacimiento: string;
        genero: string;
        metodo_pago: string;
      };
    } | null = null;
    try {
      await ensureSocioSolicitudExtraColumns();
      const userId = Number(row.id ?? 0);
      const socioId = Number(row.socio_id ?? 0) || null;
      const sq = await pool.query(
        `
        SELECT
          id,
          estado,
          solicitud_revision_campos,
          solicitud_revision_mensaje,
          direccion,
          poblacion,
          provincia,
          dni,
          fecha_nacimiento,
          genero,
          solicitud_metodo_pago
        FROM db_socios
        WHERE usuario_id = $1
           OR ($2::int IS NOT NULL AND id = $2)
        ORDER BY updated_at DESC NULLS LAST, id DESC
        LIMIT 1
        `,
        [userId, socioId],
      );
      if (sq.rows.length > 0) {
        const r0 = sq.rows[0];
        const revRaw = r0.solicitud_revision_campos;
        const est = String(r0.estado ?? "").trim() || "solicitante";
        const fn = r0.fecha_nacimiento;
        const fechaStr =
          fn === null || fn === undefined
            ? ""
            : typeof fn === "string"
              ? fn.slice(0, 10)
              : String(fn).slice(0, 10);
        socio_estado = {
          id: Number(r0.id ?? 0),
          estado: est,
          revision_campos: parseRevisionCamposRaw(revRaw),
          revision_mensaje:
            r0.solicitud_revision_mensaje != null
              ? String(r0.solicitud_revision_mensaje).trim() || null
              : null,
        };
        if (est === "pendiente_datos") {
          socio_estado.solicitud_prefill = {
            direccion: String(r0.direccion ?? "").trim(),
            poblacion: String(r0.poblacion ?? "").trim(),
            provincia: String(r0.provincia ?? "").trim(),
            dni: String(r0.dni ?? "").trim(),
            fecha_nacimiento: fechaStr,
            genero: String(r0.genero ?? "").trim(),
            metodo_pago: String(r0.solicitud_metodo_pago ?? "").trim(),
          };
        }
      }
    } catch {
      socio_estado = null;
    }

    let membership_solicitud_options: {
      cuota_importe: string;
      currency: string;
      metodos_pago: MetodoPagoOpt[];
    } | null = null;
    try {
      const opts = await loadMembershipSolicitudOptionsFromDb();
      membership_solicitud_options = {
        cuota_importe: String(opts.cuota_importe ?? ""),
        currency: "EUR",
        metodos_pago: opts.metodos_pago,
      };
    } catch {
      membership_solicitud_options = null;
    }

    res.json({
      ...row,
      nombre: split.nombre || nombreRaw,
      apellidos: apellidosValue,
      telefono: telefonoValue,
      socio_estado,
      membership_solicitud_options,
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

router.post("/perfil/solicitar-socio", requireAuth, async (req, res): Promise<void> => {
  const uid = Number(req.user!.uid);
  const usernameToken = String(req.user!.username ?? "");
  const body = req.body as Record<string, unknown>;
  const mensaje = String(body?.mensaje ?? "").trim();
  const fotoRaw = body?.foto ?? body?.avatarUrl ?? body?.fotoUrl;

  try {
    const row = await loadUserRow(uid, usernameToken);
    if (!row) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }
    const userId = Number(row.id ?? 0);
    if (!userId) {
      res.status(400).json({ error: "Usuario inválido" });
      return;
    }

    const roles = await getUserRoles(userId, String(row.rol ?? "usuario"));
    if (roles.includes("socio")) {
      res.status(400).json({ error: "Ya tienes el rol de socio." });
      return;
    }

    const nombre = String(body?.nombre ?? "").trim();
    const apellidos = String(body?.apellidos ?? "").trim();
    const email = String(body?.email ?? "").trim();
    const telefono = String(body?.telefono ?? "").trim();
    const direccion = String(body?.direccion ?? "").trim();
    const poblacion = String(body?.poblacion ?? "").trim();
    const provincia = String(body?.provincia ?? "").trim();
    const dni = String(body?.dni ?? "").trim();
    const fechaNacimientoRaw = String(body?.fecha_nacimiento ?? "").trim();
    const generoRaw = String(body?.genero ?? "").trim().toUpperCase();

    if (
      !nombre ||
      !apellidos ||
      !email ||
      !telefono ||
      !direccion ||
      !poblacion ||
      !provincia ||
      !dni ||
      !fechaNacimientoRaw
    ) {
      res.status(400).json({
        error:
          "Todos los campos son obligatorios: nombre, apellidos, email, teléfono, dirección, población, provincia, DNI, fecha de nacimiento y género.",
      });
      return;
    }
    if (generoRaw !== "H" && generoRaw !== "F" && generoRaw !== "N") {
      res.status(400).json({ error: "Género obligatorio: seleccione H, F o N." });
      return;
    }

    const fechaBirth = parseFechaNacimientoForSql(fechaNacimientoRaw);
    if (!fechaBirth.ok) {
      res.status(400).json({ error: fechaBirth.message });
      return;
    }
    const fechaNacimientoSql = fechaBirth.iso;

    await ensureSocioSolicitudExtraColumns();

    const solicitudOpts = await loadMembershipSolicitudOptionsFromDb();
    const metodoPago = String(body?.metodo_pago ?? "").trim();
    const allowedIds = new Set(solicitudOpts.metodos_pago.map((m) => m.id));
    if (!metodoPago || !allowedIds.has(metodoPago)) {
      res.status(400).json({ error: "Seleccione un método de pago válido." });
      return;
    }

    const cuotaCliente = normalizeCuotaKey(String(body?.cuota_importe ?? ""));
    const cuotaServidor = normalizeCuotaKey(solicitudOpts.cuota_importe);
    if (!cuotaCliente || cuotaCliente !== cuotaServidor) {
      res.status(400).json({
        error: "El importe de la cuota no coincide con el vigente. Recargue la página e inténtelo de nuevo.",
      });
      return;
    }

    const dniAnversoRaw = body?.dni_anverso ?? body?.dniDocAnverso;
    const dniReversoRaw = body?.dni_reverso ?? body?.dniDocReverso;
    const dniAnversoStored = await persistSolicitudDniDoc(dniAnversoRaw, "anverso");
    const dniReversoStored = await persistSolicitudDniDoc(dniReversoRaw, "reverso");
    if (!dniAnversoStored || !dniReversoStored) {
      res.status(400).json({
        error:
          "Debe adjuntar documentación del DNI/NIE (anverso y reverso) en imagen o PDF; máximo 8 MB por archivo.",
      });
      return;
    }

    const avatarStored = await persistSolicitudSocioPhoto(fotoRaw);
    if (!avatarStored) {
      res.status(400).json({ error: "La fotografía es obligatoria para tramitar la solicitud de socio." });
      return;
    }

    const metodoLabelEs =
      solicitudOpts.metodos_pago.find((m) => m.id === metodoPago)?.label_es ?? metodoPago;

    let datosExtraJson = "{}";
    try {
      const asoc = await loadAsociacionDatos();
      datosExtraJson = sanitizeSolicitudDatosExtra(body?.datos_extra, asoc.gruposCamposJson);
    } catch {
      datosExtraJson = "{}";
    }

    const socioIdFromUser = Number(row.socio_id ?? 0) || null;
    const existing = await pool.query(
      `
      SELECT id, estado
      FROM db_socios
      WHERE usuario_id = $1
         OR ($2::int IS NOT NULL AND id = $2)
      ORDER BY updated_at DESC NULLS LAST, id DESC
      LIMIT 1
      `,
      [userId, socioIdFromUser],
    );

    if (existing.rows.length > 0) {
      const sid = Number(existing.rows[0].id ?? 0);
      const estado = String(existing.rows[0].estado ?? "").trim().toLowerCase();
      await pool.query(`UPDATE db_users SET socio_id = $1, updated_at = now() WHERE id = $2`, [sid, userId]);

      if (estado === "solicitante") {
        const upSol = await pool.query(
          `
          UPDATE db_socios
          SET
            nombre = $1,
            apellidos = $2,
            email = $3,
            telefono = $4,
            direccion = $5,
            poblacion = $6,
            provincia = $7,
            dni = $8,
            fecha_nacimiento = $9::date,
            genero = $10,
            avatar_url = $11,
            dni_doc_anverso_url = $12,
            dni_doc_reverso_url = $13,
            solicitud_metodo_pago = $14,
            solicitud_cuota_importe = $15::numeric,
            solicitud_datos_extra_json = $16,
            updated_at = now()
          WHERE id = $17 AND lower(trim(coalesce(estado,''))) = 'solicitante'
          RETURNING id
          `,
          [
            nombre,
            apellidos,
            email || null,
            telefono || null,
            direccion,
            poblacion,
            provincia,
            dni,
            fechaNacimientoSql,
            generoRaw,
            avatarStored,
            dniAnversoStored,
            dniReversoStored,
            metodoPago,
            cuotaServidor,
            datosExtraJson,
            sid,
          ],
        );
        if (upSol.rows.length === 0) {
          res.status(400).json({
            error:
              "No se pudo actualizar la solicitud (el estado de la ficha ha cambiado). Recargue la página e inténtelo de nuevo.",
          });
          return;
        }

        const nombreCompletoSol = `${nombre} ${apellidos}`.trim();
        await pool.query(
          `
          UPDATE db_users
          SET
            nombre = $1,
            apellidos = $2,
            email = $3,
            telefono = $4,
            avatar_url = $5,
            socio_id = $6,
            updated_at = now()
          WHERE id = $7
          `,
          [nombreCompletoSol, apellidos, email, telefono, avatarStored, sid, userId],
        );

        try {
          await odooCall("crm.lead", "create", [{
            name: `Solicitud socio web (actualización en revisión): ${nombre} ${apellidos}`,
            contact_name: `${nombre} ${apellidos}`.trim(),
            email_from: email,
            phone: telefono || "",
            description: [
              "El solicitante ha vuelto a enviar el formulario estando la solicitud en revisión.",
              `Usuario: ${usernameToken}`,
              `DNI: ${dni}`,
              `Cuota: ${cuotaServidor} EUR; método: ${metodoLabelEs}`,
            ].join("\n"),
            type: "lead",
          }]);
        } catch {
          //
        }

        res.json({ ok: true, socio_id: sid, estado: "solicitante", avatar_url: avatarStored });
        return;
      }

      if (estado === "rechazado") {
        res.status(400).json({
          error:
            "Tu solicitud de socio fue rechazada. Para más información, contacta con la asociación.",
        });
        return;
      }

      if (estado === "pendiente_datos") {
        const up = await pool.query(
          `
          UPDATE db_socios
          SET
            nombre = $1,
            apellidos = $2,
            email = $3,
            telefono = $4,
            direccion = $5,
            poblacion = $6,
            provincia = $7,
            dni = $8,
            fecha_nacimiento = $9::date,
            genero = $10,
            avatar_url = $11,
            dni_doc_anverso_url = $12,
            dni_doc_reverso_url = $13,
            solicitud_metodo_pago = $14,
            solicitud_cuota_importe = $15::numeric,
            solicitud_datos_extra_json = $16,
            solicitud_revision_campos = NULL,
            solicitud_revision_mensaje = NULL,
            estado = 'solicitante',
            updated_at = now()
          WHERE id = $17 AND lower(trim(coalesce(estado,''))) = 'pendiente_datos'
          RETURNING id
          `,
          [
            nombre,
            apellidos,
            email || null,
            telefono || null,
            direccion,
            poblacion,
            provincia,
            dni,
            fechaNacimientoSql,
            generoRaw,
            avatarStored,
            dniAnversoStored,
            dniReversoStored,
            metodoPago,
            cuotaServidor,
            datosExtraJson,
            sid,
          ],
        );
        if (up.rows.length === 0) {
          res.status(400).json({ error: "No se pudo actualizar la solicitud con los datos enviados." });
          return;
        }

        const nombreCompletoUsuarioPd = `${nombre} ${apellidos}`.trim();
        await pool.query(
          `
          UPDATE db_users
          SET
            nombre = $1,
            apellidos = $2,
            email = $3,
            telefono = $4,
            avatar_url = $5,
            socio_id = $6,
            updated_at = now()
          WHERE id = $7
          `,
          [nombreCompletoUsuarioPd, apellidos, email, telefono, avatarStored, sid, userId],
        );

        try {
          await odooCall("crm.lead", "create", [{
            name: `Solicitud socio web (datos corregidos): ${nombre} ${apellidos}`,
            contact_name: `${nombre} ${apellidos}`.trim(),
            email_from: email,
            phone: telefono || "",
            description: [
              "El solicitante ha enviado una corrección de datos desde Mi perfil.",
              `Usuario: ${usernameToken}`,
              `DNI: ${dni}`,
              `Cuota: ${cuotaServidor} EUR; método: ${metodoLabelEs}`,
            ].join("\n"),
            type: "lead",
          }]);
        } catch {
          //
        }

        res.json({ ok: true, socio_id: sid, estado: "solicitante", avatar_url: avatarStored });
        return;
      }

      if (estado === "activo") {
        res.status(400).json({ error: "Ya tienes ficha de socio activa." });
        return;
      }

      if (estado === "baja" || estado === "inactivo" || estado === "inactive") {
        const upBaja = await pool.query(
          `
          UPDATE db_socios
          SET
            nombre = $1,
            apellidos = $2,
            email = $3,
            telefono = $4,
            direccion = $5,
            poblacion = $6,
            provincia = $7,
            dni = $8,
            fecha_nacimiento = $9::date,
            genero = $10,
            avatar_url = $11,
            dni_doc_anverso_url = $12,
            dni_doc_reverso_url = $13,
            solicitud_metodo_pago = $14,
            solicitud_cuota_importe = $15::numeric,
            solicitud_datos_extra_json = $16,
            solicitud_revision_campos = NULL,
            solicitud_revision_mensaje = NULL,
            estado = 'solicitante',
            updated_at = now()
          WHERE id = $17 AND lower(trim(coalesce(estado,''))) IN ('baja','inactivo','inactive')
          RETURNING id
          `,
          [
            nombre,
            apellidos,
            email || null,
            telefono || null,
            direccion,
            poblacion,
            provincia,
            dni,
            fechaNacimientoSql,
            generoRaw,
            avatarStored,
            dniAnversoStored,
            dniReversoStored,
            metodoPago,
            cuotaServidor,
            datosExtraJson,
            sid,
          ],
        );
        if (upBaja.rows.length === 0) {
          res.status(400).json({
            error: "No se pudo reabrir la solicitud de socio. Recargue la página o contacte con la asociación.",
          });
          return;
        }

        const nombreCompletoBaja = `${nombre} ${apellidos}`.trim();
        await pool.query(
          `
          UPDATE db_users
          SET
            nombre = $1,
            apellidos = $2,
            email = $3,
            telefono = $4,
            avatar_url = $5,
            socio_id = $6,
            updated_at = now()
          WHERE id = $7
          `,
          [nombreCompletoBaja, apellidos, email, telefono, avatarStored, sid, userId],
        );

        try {
          await odooCall("crm.lead", "create", [{
            name: `Solicitud socio web (reactivación tras baja): ${nombre} ${apellidos}`,
            contact_name: `${nombre} ${apellidos}`.trim(),
            email_from: email,
            phone: telefono || "",
            description: [
              "Nueva solicitud de socio desde Mi perfil (ficha previa en baja/inactiva).",
              `Usuario: ${usernameToken}`,
              `DNI: ${dni}`,
              `Cuota: ${cuotaServidor} EUR; método: ${metodoLabelEs}`,
            ].join("\n"),
            type: "lead",
          }]);
        } catch {
          //
        }

        res.json({ ok: true, socio_id: sid, estado: "solicitante", avatar_url: avatarStored });
        return;
      }

      res.status(400).json({
        error: `No se puede enviar una nueva solicitud en el estado actual de tu ficha (${estado || "desconocido"}). Contacta con la asociación.`,
      });
      return;
    }

    const nombreCompletoUsuario = `${nombre} ${apellidos}`.trim();
    const inserted = await pool.query(
      `
      INSERT INTO db_socios (
        nombre,
        apellidos,
        email,
        telefono,
        direccion,
        poblacion,
        provincia,
        dni,
        fecha_nacimiento,
        genero,
        avatar_url,
        dni_doc_anverso_url,
        dni_doc_reverso_url,
        solicitud_metodo_pago,
        solicitud_cuota_importe,
        estado,
        usuario_id,
        solicitud_datos_extra_json,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9::date, $10, $11, $12, $13, $14, $15::numeric, 'solicitante', $16, $17, now(), now()
      )
      RETURNING id
      `,
      [
        nombre,
        apellidos,
        email || null,
        telefono || null,
        direccion,
        poblacion,
        provincia,
        dni,
        fechaNacimientoSql,
        generoRaw,
        avatarStored,
        dniAnversoStored,
        dniReversoStored,
        metodoPago,
        cuotaServidor,
        userId,
        datosExtraJson,
      ],
    );
    const socioId = Number(inserted.rows[0]?.id ?? 0);
    if (!socioId) {
      res.status(500).json({ error: "No se pudo crear la solicitud de socio" });
      return;
    }

    await pool.query(
      `
      UPDATE db_users
      SET
        nombre = $1,
        apellidos = $2,
        email = $3,
        telefono = $4,
        avatar_url = $5,
        socio_id = $6,
        updated_at = now()
      WHERE id = $7
      `,
      [nombreCompletoUsuario, apellidos, email, telefono, avatarStored, socioId, userId],
    );

    try {
      await odooCall("crm.lead", "create", [{
        name: `Solicitud socio web: ${nombre} ${apellidos}`,
        contact_name: `${nombre} ${apellidos}`.trim(),
        email_from: email,
        phone: telefono || "",
        description: [
          "Solicitud de alta como socio desde Mi perfil (formulario completo).",
          `Usuario: ${usernameToken}`,
          `DNI: ${dni}`,
          `Dirección: ${direccion}, ${poblacion} (${provincia})`,
          `Fecha nac.: ${fechaNacimientoRaw}`,
          `Género: ${generoRaw}`,
          `Cuota indicada: ${cuotaServidor} EUR`,
          `Método de pago elegido: ${metodoLabelEs}`,
          "Documentación DNI anverso y reverso adjunta en el servidor.",
          mensaje ? `Mensaje: ${mensaje}` : "",
        ].filter(Boolean).join("\n"),
        type: "lead",
      }]);
    } catch {
      // Odoo opcional
    }

    res.json({ ok: true, socio_id: socioId, estado: "solicitante", avatar_url: avatarStored });
  } catch (err) {
    console.error("[POST /perfil/solicitar-socio]", err);
    res.status(500).json({
      error: "Error procesando la solicitud",
      detalle: describeSolicitudError(err),
    });
  }
});

router.get("/perfil/mi-socio", requireAuth, async (req, res): Promise<void> => {
  const uid = Number(req.user!.uid);
  const usernameToken = String(req.user!.username ?? "");

  try {
    const row = await loadUserRow(uid, usernameToken);
    if (!row) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }
    const userId = Number(row.id ?? 0);
    const roles = await getUserRoles(userId, String(row.rol ?? "usuario"));
    if (!roles.includes("socio")) {
      res.status(403).json({ error: "No tienes rol socio" });
      return;
    }

    const socioId = Number(row.socio_id ?? 0) || null;
    const sq = socioId
      ? await pool.query(`SELECT * FROM db_socios WHERE id = $1 LIMIT 1`, [socioId])
      : await pool.query(
          `
          SELECT * FROM db_socios
          WHERE usuario_id = $1
          ORDER BY updated_at DESC NULLS LAST, id DESC
          LIMIT 1
          `,
          [userId],
        );

    if (!sq.rows.length) {
      res.status(404).json({ error: "Ficha de socio no encontrada" });
      return;
    }

    const s = sq.rows[0] as Record<string, unknown>;
    const sidFound = Number(s.id ?? 0);
    const recordUserId = Number(s.usuario_id ?? 0);
    const linkedSocioId = Number(row.socio_id ?? 0) === sidFound;
    const ownedByUser = recordUserId === userId;
    if (!ownedByUser && !linkedSocioId) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    res.json(s);
  } catch (err) {
    res.status(500).json({ error: "Error cargando datos de socio", detalle: String(err) });
  }
});

router.put("/perfil/mi-socio", requireAuth, async (req, res): Promise<void> => {
  const uid = Number(req.user!.uid);
  const usernameToken = String(req.user!.username ?? "");
  const payload = req.body ?? {};

  try {
    const row = await loadUserRow(uid, usernameToken);
    if (!row) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }
    const userId = Number(row.id ?? 0);
    const roles = await getUserRoles(userId, String(row.rol ?? "usuario"));
    if (!roles.includes("socio")) {
      res.status(403).json({ error: "No tienes rol socio" });
      return;
    }

    const socioId = Number(row.socio_id ?? 0) || null;
    const sq = socioId
      ? await pool.query(`SELECT id, usuario_id FROM db_socios WHERE id = $1 LIMIT 1`, [socioId])
      : await pool.query(
          `
          SELECT id, usuario_id FROM db_socios
          WHERE usuario_id = $1
          ORDER BY updated_at DESC NULLS LAST, id DESC
          LIMIT 1
          `,
          [userId],
        );

    if (!sq.rows.length) {
      res.status(404).json({ error: "Ficha de socio no encontrada" });
      return;
    }

    const sid = Number(sq.rows[0].id ?? 0);
    const recordUserId = Number(sq.rows[0].usuario_id ?? 0);
    const linkedSocioId = Number(row.socio_id ?? 0) === sid;
    const ownedByUser = recordUserId === userId;
    if (!ownedByUser && !linkedSocioId) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    const nombre = String(payload.nombre ?? "").trim();
    const apellidos = String(payload.apellidos ?? "").trim();
    const email = String(payload.email ?? "").trim();
    const telefono = String(payload.telefono ?? "").trim();
    const direccion = String(payload.direccion ?? "").trim() || null;
    const poblacion = String(payload.poblacion ?? "").trim() || null;
    const provincia = String(payload.provincia ?? "").trim() || null;
    const dni = String(payload.dni ?? "").trim() || null;
    const fechaNacimientoRaw = String(payload.fecha_nacimiento ?? "").trim();
    const fechaNacimiento = fechaNacimientoRaw || null;
    const generoRaw = String(payload.genero ?? "").trim().toUpperCase();
    const genero = generoRaw === "H" || generoRaw === "F" || generoRaw === "N" ? generoRaw : null;

    if (!nombre || !apellidos || !email || !telefono) {
      res.status(400).json({ error: "Nombre, apellidos, email y teléfono son obligatorios" });
      return;
    }

    await pool.query(
      `
      UPDATE db_socios
      SET
        nombre = $1,
        apellidos = $2,
        email = $3,
        telefono = $4,
        direccion = $5,
        poblacion = $6,
        provincia = $7,
        dni = $8,
        fecha_nacimiento = $9::date,
        genero = $10,
        updated_at = now()
      WHERE id = $11
      `,
      [nombre, apellidos, email, telefono, direccion, poblacion, provincia, dni, fechaNacimiento, genero, sid],
    );

    await pool.query(
      `
      UPDATE db_users
      SET
        nombre = $1,
        apellidos = $2,
        email = $3,
        telefono = $4,
        updated_at = now()
      WHERE id = $5
      `,
      [nombre, apellidos, email, telefono, userId],
    );

    const updated = await pool.query(`SELECT * FROM db_socios WHERE id = $1`, [sid]);
    res.json(updated.rows[0] ?? {});
  } catch (err) {
    res.status(500).json({ error: "Error guardando datos de socio", detalle: String(err) });
  }
});

export default router;
