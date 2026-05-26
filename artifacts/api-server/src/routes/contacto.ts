import { Router, type IRouter } from "express";
import { odooCall } from "../lib/odoo";
import { db, pool } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq, ilike } from "drizzle-orm";
import { createHash } from "node:crypto";

const router: IRouter = Router();

function generateTempOdooUid(): number {
  // db_users.odoo_uid es INTEGER (32-bit). Debe estar en rango [-2147483648, 2147483647].
  // Reservamos IDs negativos temporales para altas locales antes de sincronizar con Odoo.
  return -(Math.floor(Math.random() * 2_000_000_000) + 1);
}

async function ensureUserLocalAuthColumns() {
  try {
    await pool.query(`
      ALTER TABLE db_users
      ADD COLUMN IF NOT EXISTS apellidos varchar(255),
      ADD COLUMN IF NOT EXISTS telefono varchar(50),
      ADD COLUMN IF NOT EXISTS password_hash text
    `);
  } catch {
    // Puede fallar por permisos de owner; continuamos con inserción compatible.
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

router.post("/contacto", async (req, res): Promise<void> => {
  const {
    nombre,
    apellidos,
    email,
    telefono,
    username,
    acceptedPrivacy,
    password,
    confirmPassword,
    mensaje,
  } = req.body ?? {};

  if (!nombre || !apellidos || !email || !telefono || !username || !acceptedPrivacy) {
    res.status(400).json({ error: "Nombre, apellidos, email, teléfono, usuario y aceptación de privacidad son obligatorios" });
    return;
  }
  if (acceptedPrivacy !== true) {
    res.status(400).json({ error: "Debe aceptar la política de privacidad para continuar con el registro" });
    return;
  }
  if (!password || String(password).length < 8) {
    res.status(400).json({ error: "La contraseña es obligatoria y debe tener al menos 8 caracteres" });
    return;
  }
  if (String(password) !== String(confirmPassword ?? "")) {
    res.status(400).json({ error: "La confirmación de contraseña no coincide" });
    return;
  }

  try {
    await ensureUserLocalAuthColumns();
    const requestedUsername = String(username).trim();
    const displayName = `${String(nombre ?? "").trim()} ${String(apellidos ?? "").trim()}`.trim();
    const emailValue = String(email ?? "").trim();
    const passwordValue = String(password ?? "");
    const passwordHash = createHash("sha256").update(passwordValue).digest("hex");
    const hasApellidos = await hasColumn("apellidos");
    const hasTelefono = await hasColumn("telefono");
    const hasPasswordHash = await hasColumn("password_hash");
    if (!hasApellidos || !hasTelefono || !hasPasswordHash) {
      res.status(500).json({
        error: "Estructura db_users incompleta. Ejecuta lib/db/fix-db-users-perfil-auth.sql",
      });
      return;
    }
    const [existingByUsername] = await db.select({
      id: usersTable.id,
      rol: usersTable.rol,
    }).from(usersTable).where(eq(usersTable.username, requestedUsername)).limit(1);

    if (existingByUsername) {
      res.status(409).json({ error: "El usuario solicitado ya existe. Elija otro nombre de usuario." });
      return;
    } else {
      const [existingByEmail] = await db.select({
        id: usersTable.id,
      }).from(usersTable).where(ilike(usersTable.email, emailValue)).limit(1);

      if (existingByEmail) {
        res.status(409).json({ error: "Ya existe un registro con ese email. Contacte con la asociación para recuperar el acceso." });
        return;
      } else {
        // Usuario local previo a Odoo para habilitar futuras asignaciones de rol.
        // Reintentamos por si hay colisión de odoo_uid temporal (clave única).
        let inserted = false;
        for (let attempt = 0; attempt < 5 && !inserted; attempt += 1) {
          try {
            const odooUidValue = generateTempOdooUid();
            const columns = ["odoo_uid", "socio_id", "username", "nombre", "email", "rol", "avatar_url", "ultimo_acceso", "created_at", "updated_at"];
            const values: Array<string | number | null> = [
              odooUidValue,
              null,
              requestedUsername,
              displayName || requestedUsername,
              emailValue || null,
              "usuario",
              null,
              null,
              null,
              null,
            ];
            columns.splice(4, 0, "apellidos");
            values.splice(4, 0, String(apellidos ?? "").trim() || null);
            columns.splice(6, 0, "telefono");
            values.splice(6, 0, String(telefono ?? "").trim() || null);
            const insertAt = columns.indexOf("created_at");
            columns.splice(insertAt, 0, "password_hash");
            values.splice(insertAt, 0, passwordHash);
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
            inserted = true;
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const isUniqueViolation = message.includes("duplicate key") || message.includes("unique");
            if (!isUniqueViolation || attempt === 4) throw error;
          }
        }
      }
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[POST /contacto] Error alta usuario local:", detail);
    res.status(500).json({
      error: "No se pudo completar el alta del usuario local",
      ...(process.env.NODE_ENV === "development" ? { detalle: detail } : {}),
    });
    return;
  }

  try {
    await odooCall("crm.lead", "create", [{
      name: `Alta web usuario: ${nombre} ${apellidos}`,
      contact_name: `${nombre} ${apellidos}`.trim(),
      email_from: email,
      phone: telefono ?? "",
      description: [
        "Solicitud de alta de usuario desde formulario web.",
        `Nombre: ${nombre}`,
        `Apellidos: ${apellidos}`,
        `Usuario solicitado: ${username}`,
        mensaje ? `Mensaje: ${mensaje}` : "",
      ].filter(Boolean).join("\n"),
      type: "lead",
    }]);
  } catch {
    // Si Odoo no disponible, registrar igualmente
  }

  res.json({ success: true, message: "Solicitud enviada correctamente. Revisaremos sus datos y nos pondremos en contacto." });
});

export default router;
