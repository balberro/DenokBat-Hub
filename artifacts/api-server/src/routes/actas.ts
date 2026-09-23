import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import {
  ACTA_ESTADOS,
  ACTA_EXPEDIENTE_ACCIONES,
  ACTA_RESULTADOS_PROPUESTA,
  type ActaEstado,
  type ActaExpedienteAccion,
  type ActaResultadoPropuesta,
} from "@workspace/db/schema";
import { requireAuth } from "../middlewares/auth";
import { sendActaEmail } from "../lib/mailActas";
import {
  persistActaPdf,
  anyoMesDe,
  normalizarAnyoMes,
  tituloActaAnyoMes,
  primerDiaAnyoMes,
} from "../lib/actaPdf";

const router: IRouter = Router();

function rolesOf(user: { role?: string; roles?: string[] }): string[] {
  if (Array.isArray(user.roles) && user.roles.length > 0) return user.roles;
  if (user.role) return [user.role];
  return [];
}
function hasAnyRole(user: { role?: string; roles?: string[] }, ...allowed: string[]): boolean {
  const rs = rolesOf(user);
  return allowed.some((r) => rs.includes(r));
}
/**
 * Roles con acceso TOTAL al gestor de actas (lectura y escritura), además de
 * los roles funcionales. `administrador` y `superadmin` tienen acceso total en
 * todo el proyecto (ver `replit.md`), por lo que también pueden gestionar
 * actas aunque no tengan el rol `contable`.
 */
const ROLES_ESCRITURA_EXTRA = ["administrador", "superadmin"] as const;
function puedeLeer(user: { role?: string; roles?: string[] }): boolean {
  return hasAnyRole(user, "directivo", "contable", ...ROLES_ESCRITURA_EXTRA);
}
/**
 * Lectura ampliada del gestor de actas: directivo, contable, admin y **delegado**.
 * El delegado solo puede ver actas en estado `completa` o `aceptada`; los
 * borradores quedan restringidos al equipo redactor (directivo/contable/admin).
 */
function puedeLeerExtendida(user: { role?: string; roles?: string[] }): boolean {
  return hasAnyRole(user, "directivo", "contable", "delegado", ...ROLES_ESCRITURA_EXTRA);
}
function esRedactor(user: { role?: string; roles?: string[] }): boolean {
  return hasAnyRole(user, "directivo", "contable", ...ROLES_ESCRITURA_EXTRA);
}
function puedeEscribir(user: { role?: string; roles?: string[] }): boolean {
  return hasAnyRole(user, "contable", ...ROLES_ESCRITURA_EXTRA);
}
function isEstado(s: string): s is ActaEstado {
  return (ACTA_ESTADOS as readonly string[]).includes(s);
}
function isResultado(s: string): s is ActaResultadoPropuesta {
  return (ACTA_RESULTADOS_PROPUESTA as readonly string[]).includes(s);
}
function isExpedienteAccion(s: string): s is ActaExpedienteAccion {
  return (ACTA_EXPEDIENTE_ACCIONES as readonly string[]).includes(s);
}

/**
 * Error de esquema de la base de datos de actas.
 *
 * Se lanza cuando el usuario de la aplicación no puede crear/actualizar el
 * esquema de `db_actas` (típicamente porque no es el *owner* de la tabla y las
 * sentencias `CREATE TABLE`/`ALTER TABLE` fallan con "must be owner of table").
 *
 * Lleva `sqlHint` con el comando exacto que hay que ejecutar (como owner /
 * superusuario) para arreglarlo, de modo que el mensaje de error que llega al
 * usuario sea directamente accionable.
 */
class EsquemaActasError extends Error {
  readonly code: "ESQUEMA_ACTAS";
  readonly sqlHint: string;
  readonly causa: string;

  constructor(message: string, opts: { sqlHint: string; causa: string }) {
    super(message);
    this.name = "EsquemaActasError";
    this.code = "ESQUEMA_ACTAS";
    this.sqlHint = opts.sqlHint;
    this.causa = opts.causa;
  }
}

const SQL_HINT_ACTAS = [
  "-- Ejecutar como OWNER (p. ej. postgres) contra la base de datos de la app:",
  '--   psql "$DATABASE_URL_OWNER" -d <base_de_datos> -f lib/db/fix-db-actas.sql',
  "--   psql \"$DATABASE_URL_OWNER\" -d <base_de_datos> -f lib/db/fix-db-actas-aceptada.sql",
  "-- O bien dar permisos al usuario de la app sobre las tablas:",
  "--   ALTER TABLE db_actas OWNER TO <usuario_app>;",
  "--   GRANT ALL ON db_actas, db_acta_puntos, db_actas_pdf TO <usuario_app>;",
  "--   GRANT ALL ON SEQUENCE db_actas_numero_seq TO <usuario_app>;",
].join("\n");

/** Normaliza el error crudo de PostgreSQL a texto útil para el usuario. */
function describirErrorPg(e: unknown): string {
  const err = e as { code?: string; message?: string; detail?: string; routine?: string };
  const parts: string[] = [];
  if (err?.code) parts.push(`código ${err.code}`);
  if (err?.message) parts.push(err.message);
  if (err?.detail) parts.push(err.detail);
  return parts.join(" · ") || String(e);
}

async function ensureActasSchema(): Promise<void> {
  try {
    await pool.query(`CREATE SEQUENCE IF NOT EXISTS db_actas_numero_seq`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS db_actas (
        id                SERIAL PRIMARY KEY,
        numero            INTEGER UNIQUE,
        convocatoria_id   INTEGER,
        titulo            VARCHAR(500) NOT NULL,
        fecha             DATE,
        estado            VARCHAR(30) NOT NULL DEFAULT 'borrador',
        asistentes        TEXT,
        resumen           TEXT,
        observaciones     TEXT,
        completada_en     TIMESTAMPTZ,
        firmada_en        TIMESTAMPTZ,
        creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
        actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
        creado_por        INTEGER
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS db_acta_puntos (
        id                      SERIAL PRIMARY KEY,
        acta_id                 INTEGER NOT NULL,
        convocatoria_punto_id   INTEGER,
        orden                   INTEGER NOT NULL DEFAULT 0,
        propuesta_id            INTEGER,
        titulo                  VARCHAR(500),
        descripcion             TEXT,
        acuerdo                 TEXT,
        resultado_propuesta     VARCHAR(30),
        expediente_accion       VARCHAR(20),
        expediente_id           INTEGER,
        notas                   TEXT,
        creado_en               TIMESTAMPTZ NOT NULL DEFAULT now(),
        actualizado_en          TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS db_actas_estado_idx
        ON db_actas (estado, fecha DESC NULLS LAST, creado_en DESC)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS db_acta_puntos_acta_idx
        ON db_acta_puntos (acta_id, orden, id)
    `);
    // PDF firmado del acta en tabla aparte (relación 1:1), ver
    // `lib/db/fix-db-actas-aceptada.sql`.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS db_actas_pdf (
        id              SERIAL PRIMARY KEY,
        acta_id         INTEGER NOT NULL,
        pdf_url         TEXT NOT NULL,
        pdf_filename    TEXT,
        pdf_anyo_mes    VARCHAR(7),
        pdf_size        INTEGER,
        subido_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
        subido_por      INTEGER,
        creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
        actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    // Relación 1:1 (un único PDF por acta). Nombre de constraint idéntico al
    // de `lib/db/fix-db-actas-aceptada.sql` para no duplicar índices únicos.
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'db_actas_pdf_acta_uq'
            AND conrelid = 'db_actas_pdf'::regclass
        ) THEN
          ALTER TABLE db_actas_pdf
            ADD CONSTRAINT db_actas_pdf_acta_uq UNIQUE (acta_id);
        END IF;
      END $$;
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS db_actas_pdf_anyo_mes_idx
        ON db_actas_pdf (pdf_anyo_mes)
        WHERE pdf_anyo_mes IS NOT NULL
    `);
    // Normalizar el estado legado 'firmada' → 'aceptada'. Un UPDATE no requiere
    // ser owner de la tabla, solo permiso de UPDATE. Best-effort: si fallara
    // (p. ej. por un CHECK antiguo que no admite 'aceptada'), no bloqueamos.
    try {
      await pool.query(`UPDATE db_actas SET estado = 'aceptada' WHERE estado = 'firmada'`);
    } catch (e) {
      console.warn(
        "[ensureActasSchema] No se pudo normalizar 'firmada'→'aceptada' (se ignora):",
        describirErrorPg(e),
      );
    }

    // Ajustar el CHECK de estados de forma BEST-EFFORT y sin bloquear.
    //
    // En muchos entornos el usuario de la aplicación NO es propietario de
    // `db_actas`, y `ALTER TABLE ... DROP/ADD CONSTRAINT` falla con
    // "must be owner of table" → tumbaba TODA la petición con 503 (por eso no
    // se guardaba un acta en borrador). El CHECK definitivo lo fija la
    // migración como owner (`lib/db/fix-db-actas-aceptada.sql`); aquí solo lo
    // intentamos y, si no hay permisos, lo ignoramos y seguimos.
    const chkRes = await pool.query<{ def: string }>(`
      SELECT pg_get_constraintdef(oid) AS def
        FROM pg_constraint
       WHERE conname = 'db_actas_estado_chk'
         AND conrelid = 'db_actas'::regclass
    `);
    const yaAdmiteAceptada =
      chkRes.rowCount === 0 || /aceptada/i.test(String(chkRes.rows[0]?.def ?? ""));
    if (!yaAdmiteAceptada) {
      try {
        await pool.query(`
          DO $$
          BEGIN
            ALTER TABLE db_actas DROP CONSTRAINT db_actas_estado_chk;
            ALTER TABLE db_actas
              ADD CONSTRAINT db_actas_estado_chk
              CHECK (estado IN ('borrador', 'completa', 'aceptada'));
          END $$;
        `);
      } catch (e) {
        console.warn(
          "[ensureActasSchema] No se pudo ajustar db_actas_estado_chk (se ignora; " +
            "aplicar lib/db/fix-db-actas-aceptada.sql como owner):",
          describirErrorPg(e),
        );
      }
    }
  } catch (e) {
    // No nos tragamos el error: lo convertimos en uno claro y accionable para
    // que el usuario sepa exactamente qué ejecutar.
    const causa = describirErrorPg(e);
    console.error("[ensureActasSchema] Fallo preparando el esquema de actas:", causa);
    throw new EsquemaActasError(
      [
        "No se pudo preparar el esquema de la base de datos de actas (falta una",
        "columna o el usuario de la aplicación no es propietario de la tabla).",
        `Causa: ${causa}`,
      ].join(" "),
      { sqlHint: SQL_HINT_ACTAS, causa },
    );
  }
}

/**
 * Envía al cliente un error claro de esquema (503) y devuelve `true` si el
 * error recibido es de este tipo (esquema de actas). Pensado para usarse en el
 * `catch` de cada endpoint: si es un `EsquemaActasError` responde con detalle
 * accionable y señala que ya se ha gestionado.
 */
function responderErrorEsquema(res: import("express").Response, err: unknown): boolean {
  if (err instanceof EsquemaActasError) {
    res.status(503).json({
      error:
        "La base de datos de actas no está lista (falta una migración de esquema " +
        "o permisos). Revisa el detalle y ejecuta el SQL indicado como propietario " +
        "de la base de datos.",
      codigo: err.code,
      detalle: err.message,
      causa: err.causa,
      solucion_sql: err.sqlHint,
    });
    return true;
  }
  return false;
}

/**
 * Comprueba si una tabla existe en el esquema actual (cacheado en memoria).
 *
 * Sirve para tolerar instalaciones donde la tabla del buzón de propuestas
 * (`db_propuestas_junta`) todavía no se ha creado: en ese caso usamos
 * variantes de las consultas SIN el `LEFT JOIN` a esa tabla, de modo que
 * convocatorias y actas con puntos libres siguen funcionando.
 */
const tablasExistentesCache = new Map<string, boolean>();
async function tablaExiste(nombre: string): Promise<boolean> {
  const cached = tablasExistentesCache.get(nombre);
  if (cached !== undefined) return cached;
  try {
    const r = await pool.query("SELECT to_regclass($1) AS reg", [nombre]);
    const existe = r.rows[0]?.reg != null;
    tablasExistentesCache.set(nombre, existe);
    return existe;
  } catch {
    // Ante la duda, asumimos que existe para no cambiar el comportamiento.
    return true;
  }
}
async function propuestasDisponibles(): Promise<boolean> {
  return tablaExiste("db_propuestas_junta");
}

function mapActa(row: Record<string, unknown>) {
  return {
    id: row.id,
    numero: row.numero,
    convocatoria_id: row.convocatoria_id,
    titulo: row.titulo,
    fecha: row.fecha,
    estado: row.estado,
    asistentes: row.asistentes,
    resumen: row.resumen,
    observaciones: row.observaciones,
    completada_en: row.completada_en,
    firmada_en: row.firmada_en,
    // El PDF firmado vive en `db_actas_pdf`; se expone como `pdf_*` en la API.
    pdf_url: row.pdf_pdf_url ?? null,
    pdf_filename: row.pdf_pdf_filename ?? null,
    pdf_anyo_mes: row.pdf_pdf_anyo_mes ?? null,
    pdf_size: row.pdf_pdf_size ?? null,
    pdf_subido_en: row.pdf_pdf_subido_en ?? null,
    pdf_subido_por: row.pdf_pdf_subido_por ?? null,
    creado_en: row.creado_en,
    actualizado_en: row.actualizado_en,
    creado_por: row.creado_por,
    convocatoria: row.conv_titulo
      ? {
          id: row.convocatoria_id,
          numero: row.conv_numero,
          titulo: row.conv_titulo,
          tipo: row.conv_tipo,
          fecha: row.conv_fecha,
          hora: row.conv_hora,
          lugar: row.conv_lugar,
        }
      : null,
  };
}

function mapPunto(row: Record<string, unknown>) {
  return {
    id: row.id,
    acta_id: row.acta_id,
    convocatoria_punto_id: row.convocatoria_punto_id,
    orden: row.orden,
    propuesta_id: row.propuesta_id,
    titulo: row.titulo,
    descripcion: row.descripcion,
    acuerdo: row.acuerdo,
    resultado_propuesta: row.resultado_propuesta,
    expediente_accion: row.expediente_accion,
    expediente_id: row.expediente_id,
    notas: row.notas,
    propuesta: row.prop_denominacion
      ? {
          id: row.propuesta_id,
          denominacion: row.prop_denominacion,
          descripcion: row.prop_descripcion,
          decision_solicitada: row.prop_decision_solicitada,
          estado_buzon: row.prop_estado_buzon,
          resultado: row.prop_resultado,
          expediente_id: row.prop_expediente_id,
        }
      : null,
  };
}

router.get("/admin/actas", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!puedeLeerExtendida(user)) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }
  try {
    await ensureActasSchema();
    const filters: string[] = [];
    const params: unknown[] = [];
    const estadoQuery = typeof req.query.estado === "string" ? req.query.estado : "";
    // El contable y los roles de acceso total (admin/superadmin) ven todos los
    // estados por defecto; el directivo arranca filtrado por "completa".
    const esContable = hasAnyRole(user, "contable", ...ROLES_ESCRITURA_EXTRA);
    if (estadoQuery && isEstado(estadoQuery)) {
      params.push(estadoQuery);
      filters.push(`a.estado = $${params.length}`);
    } else if (esRedactor(user) && !esContable) {
      // El directivo (sin rol contable) trabaja por defecto sobre actas "completa".
      // Si necesita ver borradores o firmadas, lo selecciona en el filtro.
      // El contable tiene acceso total a todos los estados desde Documentación → Actas.
      filters.push(`a.estado = 'completa'`);
    }
    // El delegado nunca ve borradores.
    if (!esRedactor(user)) {
      filters.push(`a.estado IN ('completa','aceptada')`);
    }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const rows = await pool.query(
      `SELECT a.*, c.numero AS conv_numero, c.titulo AS conv_titulo,
              c.tipo AS conv_tipo, c.fecha AS conv_fecha, c.hora AS conv_hora, c.lugar AS conv_lugar,
              p.pdf_url AS pdf_pdf_url, p.pdf_filename AS pdf_pdf_filename,
              p.pdf_anyo_mes AS pdf_pdf_anyo_mes, p.pdf_size AS pdf_pdf_size,
              p.subido_en AS pdf_pdf_subido_en, p.subido_por AS pdf_pdf_subido_por
         FROM db_actas a
         LEFT JOIN db_convocatorias c ON c.id = a.convocatoria_id
         LEFT JOIN db_actas_pdf p ON p.acta_id = a.id
         ${where}
        ORDER BY a.fecha DESC NULLS LAST, a.creado_en DESC`,
      params,
    );
    res.json({ items: rows.rows.map(mapActa), total: rows.rowCount ?? rows.rows.length });
  } catch (err) {
    if (responderErrorEsquema(res, err)) return;
    console.error("[GET /admin/actas]", err);
    res.status(500).json({ error: "Error consultando actas", detalle: String(err) });
  }
});

router.get(
  "/admin/actas/convocatorias-disponibles",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!puedeLeer(user)) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    try {
      await ensureActasSchema();
      const rows = await pool.query(`
        SELECT c.*
          FROM db_convocatorias c
          LEFT JOIN db_actas a ON a.convocatoria_id = c.id
         WHERE a.id IS NULL
           AND c.estado IN ('publicada', 'celebrada')
         ORDER BY c.fecha DESC NULLS LAST, c.creado_en DESC
      `);
      res.json({ items: rows.rows, total: rows.rowCount ?? rows.rows.length });
    } catch (err) {
      console.error("[GET /admin/actas/convocatorias-disponibles]", err);
      res.status(500).json({ error: "Error", detalle: String(err) });
    }
  },
);

router.get("/admin/actas/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!puedeLeerExtendida(user)) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id no válido" });
    return;
  }
  try {
    await ensureActasSchema();
    const actaRes = await pool.query(
      `SELECT a.*, c.numero AS conv_numero, c.titulo AS conv_titulo,
              c.tipo AS conv_tipo, c.fecha AS conv_fecha, c.hora AS conv_hora, c.lugar AS conv_lugar,
              p.pdf_url AS pdf_pdf_url, p.pdf_filename AS pdf_pdf_filename,
              p.pdf_anyo_mes AS pdf_pdf_anyo_mes, p.pdf_size AS pdf_pdf_size,
              p.subido_en AS pdf_pdf_subido_en, p.subido_por AS pdf_pdf_subido_por
         FROM db_actas a
         LEFT JOIN db_convocatorias c ON c.id = a.convocatoria_id
         LEFT JOIN db_actas_pdf p ON p.acta_id = a.id
        WHERE a.id = $1`,
      [id],
    );
    if (actaRes.rowCount === 0) {
      res.status(404).json({ error: "Acta no encontrada" });
      return;
    }
    if (!esRedactor(user) && actaRes.rows[0].estado === "borrador") {
      res
        .status(403)
        .json({ error: "No autorizado: el acta está en borrador." });
      return;
    }
    const conPropuestas = await propuestasDisponibles();
    const puntosRes = await pool.query(
      `SELECT ap.*,
              ${conPropuestas ? `
              p.denominacion AS prop_denominacion,
              p.descripcion AS prop_descripcion,
              p.decision_solicitada AS prop_decision_solicitada,
              p.estado_buzon AS prop_estado_buzon,
              p.resultado AS prop_resultado,
              p.expediente_id AS prop_expediente_id` : `
              NULL::varchar AS prop_denominacion,
              NULL::text AS prop_descripcion,
              NULL::varchar AS prop_decision_solicitada,
              NULL::varchar AS prop_estado_buzon,
              NULL::varchar AS prop_resultado,
              NULL::int AS prop_expediente_id`}
         FROM db_acta_puntos ap
         ${conPropuestas ? "LEFT JOIN db_propuestas_junta p ON p.id = ap.propuesta_id" : ""}
        WHERE ap.acta_id = $1
        ORDER BY ap.orden, ap.id`,
      [id],
    );
    res.json({
      acta: mapActa(actaRes.rows[0]),
      puntos: puntosRes.rows.map(mapPunto),
    });
  } catch (err) {
    console.error("[GET /admin/actas/:id]", err);
    res.status(500).json({ error: "Error", detalle: String(err) });
  }
});

router.post(
  "/admin/actas/desde-convocatoria",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!puedeEscribir(user)) {
      res.status(403).json({ error: "La creación de actas está reservada al rol contable." });
      return;
    }
    const convocatoriaId = parseInt(
      String(req.body?.convocatoria_id ?? req.body?.convocatoriaId ?? ""),
      10,
    );
    if (!Number.isFinite(convocatoriaId)) {
      res.status(400).json({ error: "convocatoria_id no válido" });
      return;
    }

    const client = await pool.connect();
    try {
      await ensureActasSchema();
      await client.query("BEGIN");

      const convRes = await client.query(
        "SELECT * FROM db_convocatorias WHERE id = $1 FOR UPDATE",
        [convocatoriaId],
      );
      if (convRes.rowCount === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Convocatoria no encontrada" });
        return;
      }
      const conv = convRes.rows[0] as Record<string, unknown>;
      if (!["publicada", "celebrada"].includes(String(conv.estado))) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "Solo se puede crear acta desde una convocatoria publicada o celebrada",
          estado: conv.estado,
        });
        return;
      }

      const existing = await client.query(
        "SELECT id FROM db_actas WHERE convocatoria_id = $1",
        [convocatoriaId],
      );
      if ((existing.rowCount ?? 0) > 0) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "Esta convocatoria ya tiene acta",
          acta_id: existing.rows[0].id,
        });
        return;
      }

      const titulo = String(req.body?.titulo ?? `Acta: ${conv.titulo ?? ""}`).trim();
      const fecha = String(req.body?.fecha ?? conv.fecha ?? "").trim() || null;
      const asistentes = String(req.body?.asistentes ?? "").trim() || null;
      const resumen = String(req.body?.resumen ?? "").trim() || null;
      const observaciones = String(req.body?.observaciones ?? "").trim() || null;

      // El usuario puede crear el acta directamente en borrador (por defecto) o
      // ya como completa (se resolverán las propuestas al final, igual que en
      // POST /admin/actas/:id/completar).
      const estadoSolicitado = String(req.body?.estado ?? "borrador").trim();
      if (estadoSolicitado !== "borrador" && estadoSolicitado !== "completa") {
        await client.query("ROLLBACK");
        res.status(400).json({ error: "estado debe ser 'borrador' o 'completa'" });
        return;
      }
      const crearComoCompleta = estadoSolicitado === "completa";

      const actaRes = await client.query(
        `INSERT INTO db_actas
           (numero, convocatoria_id, titulo, fecha, estado, asistentes, resumen, observaciones, creado_por)
         VALUES (nextval('db_actas_numero_seq')::int, $1, $2, $3::date, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          convocatoriaId,
          titulo,
          fecha,
          estadoSolicitado,
          asistentes,
          resumen,
          observaciones,
          Number.isFinite(user.uid) ? user.uid : null,
        ],
      );
      const acta = actaRes.rows[0] as Record<string, unknown>;
      const actaId = Number(acta.id);

      const conPropuestas = await propuestasDisponibles();
      await client.query(
        `INSERT INTO db_acta_puntos
           (acta_id, convocatoria_punto_id, orden, propuesta_id, titulo, descripcion, notas)
         SELECT $1,
                cp.id,
                cp.orden,
                cp.propuesta_id,
                ${conPropuestas
                  ? "COALESCE(cp.titulo, p.denominacion)"
                  : "cp.titulo"},
                ${conPropuestas
                  ? "COALESCE(cp.descripcion, p.descripcion)"
                  : "cp.descripcion"},
                cp.notas
           FROM db_convocatoria_puntos cp
           ${conPropuestas ? "LEFT JOIN db_propuestas_junta p ON p.id = cp.propuesta_id" : ""}
          WHERE cp.convocatoria_id = $2
          ORDER BY cp.orden, cp.id`,
        [actaId, convocatoriaId],
      );

      // Aplicar borradores de decisión preparados al crear el acta.
      const overrides = Array.isArray(req.body?.puntos_overrides)
        ? (req.body.puntos_overrides as Array<Record<string, unknown>>)
        : [];
      for (const ov of overrides) {
        const cpId = parseInt(String(ov.convocatoria_punto_id ?? ""), 10);
        if (!Number.isFinite(cpId)) continue;
        const fields: string[] = [];
        const values: unknown[] = [];
        let i = 0;
        if (typeof ov.acuerdo === "string") {
          fields.push(`acuerdo = $${++i}`);
          values.push(ov.acuerdo);
        }
        if (typeof ov.resultado_propuesta === "string") {
          const v = ov.resultado_propuesta.trim();
          if (v === "" || isResultado(v)) {
            fields.push(`resultado_propuesta = $${++i}`);
            values.push(v === "" ? null : v);
          }
        }
        if (typeof ov.expediente_accion === "string") {
          const v = ov.expediente_accion.trim();
          if (v === "" || isExpedienteAccion(v)) {
            fields.push(`expediente_accion = $${++i}`);
            values.push(v === "" ? null : v);
          }
        }
        if (ov.expediente_id !== undefined) {
          const raw = String(ov.expediente_id ?? "").trim();
          if (raw === "") {
            fields.push(`expediente_id = $${++i}`);
            values.push(null);
          } else {
            const expId = parseInt(raw, 10);
            if (Number.isFinite(expId)) {
              fields.push(`expediente_id = $${++i}`);
              values.push(expId);
            }
          }
        }
        if (typeof ov.notas === "string") {
          fields.push(`notas = $${++i}`);
          values.push(ov.notas);
        }
        if (fields.length === 0) continue;
        fields.push(`actualizado_en = now()`);
        values.push(actaId, cpId);
        await client.query(
          `UPDATE db_acta_puntos
              SET ${fields.join(", ")}
            WHERE acta_id = $${++i} AND convocatoria_punto_id = $${++i}`,
          values,
        );
      }

      if (conv.estado !== "celebrada") {
        await client.query(
          `UPDATE db_convocatorias
              SET estado = 'celebrada',
                  celebrada_en = COALESCE(celebrada_en, now()),
                  actualizado_en = now()
            WHERE id = $1`,
          [convocatoriaId],
        );
      }

      // Si se creó directamente como "completa", resolver las propuestas de los
      // puntos con resultado (misma lógica que POST /admin/actas/:id/completar).
      // Si la tabla del buzón no existe, no hay propuestas que resolver.
      if (crearComoCompleta && conPropuestas) {
        const puntosRes = await client.query(
          `SELECT * FROM db_acta_puntos WHERE acta_id = $1 ORDER BY orden, id FOR UPDATE`,
          [actaId],
        );
        const ahora = new Date();
        for (const punto of puntosRes.rows as Record<string, unknown>[]) {
          if (punto.propuesta_id == null || punto.resultado_propuesta == null) continue;
          const propuestaId = Number(punto.propuesta_id);
          const resultado = String(punto.resultado_propuesta);
          const propRes = await client.query(
            "SELECT * FROM db_propuestas_junta WHERE id = $1 FOR UPDATE",
            [propuestaId],
          );
          if (propRes.rowCount === 0) continue;
          const prop = propRes.rows[0] as Record<string, unknown>;
          const expedienteResultadoRaw =
            prop.origen_tipo === "subvencion" && prop.origen_id != null
              ? Number(prop.origen_id)
              : Number(punto.expediente_id);
          const expedienteResultadoId = Number.isFinite(expedienteResultadoRaw)
            ? expedienteResultadoRaw
            : null;
          const resultadoGestionaExpediente =
            resultado === "expediente_abierto" || resultado === "expediente_cerrado";

          await client.query(
            `UPDATE db_propuestas_junta
                SET estado_buzon = 'resuelta',
                    resultado = $1,
                    resuelta_en = $2,
                    actualizado_en = $2,
                    expediente_id = CASE WHEN $3::boolean THEN COALESCE($4, expediente_id) ELSE expediente_id END,
                    observaciones = COALESCE($5, observaciones)
              WHERE id = $6`,
            [
              resultado,
              ahora,
              resultadoGestionaExpediente,
              expedienteResultadoId,
              punto.acuerdo ? String(punto.acuerdo) : null,
              propuestaId,
            ],
          );

          let nuevoEstadoSugerencia: "rechazada" | "aportaciones" | "planificada" | null = null;
          if (resultado === "rechazada") nuevoEstadoSugerencia = "rechazada";
          if (resultado === "mas_aportaciones") nuevoEstadoSugerencia = "aportaciones";
          if (resultado === "expediente_abierto") nuevoEstadoSugerencia = "planificada";

          if (
            prop.origen_tipo === "sugerencia" &&
            prop.origen_id != null &&
            nuevoEstadoSugerencia != null
          ) {
            const sugId = Number(prop.origen_id);
            if (Number.isFinite(sugId)) {
              await client.query(
                `UPDATE db_sugerencias
                    SET estado = $1,
                        expediente_id = CASE WHEN $2::boolean THEN COALESCE($3, expediente_id) ELSE expediente_id END,
                        updated_at = $4
                  WHERE id = $5`,
                [
                  nuevoEstadoSugerencia,
                  resultado === "expediente_abierto",
                  expedienteResultadoId,
                  ahora,
                  sugId,
                ],
              );
              await client.query(
                "UPDATE db_sugerencias SET estado = $1, updated_at = $2 WHERE parent_id = $3",
                [nuevoEstadoSugerencia, ahora, sugId],
              );
            }
          }
        }
        await client.query(
          `UPDATE db_actas
              SET completada_en = $1,
                  actualizado_en = $1
            WHERE id = $2`,
          [ahora, actaId],
        );
        acta.estado = "completa";
        acta.completada_en = ahora;
      }

      await client.query("COMMIT");
      res.status(201).json({ ok: true, acta });
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {
        //
      }
      if (responderErrorEsquema(res, err)) return;
      console.error("[POST /admin/actas/desde-convocatoria]", err);
      res.status(500).json({ error: "Error creando acta", detalle: String(err) });
    } finally {
      client.release();
    }
  },
);

/**
 * Sincroniza los puntos del acta con el orden del día actual de su convocatoria.
 *
 * Solo en actas en borrador y vinculadas a una convocatoria. Permite reflejar
 * en el acta los cambios hechos en la convocatoria DESPUÉS de crear el acta:
 *   - Añade los puntos nuevos de la convocatoria.
 *   - Actualiza título/descripción de los puntos ya presentes (preservando el
 *     acuerdo, la resolución de propuesta, la acción de expediente y las notas
 *     ya escritos en el acta).
 *   - Propone eliminar los puntos del acta cuyo punto de convocatoria ya no
 *     existe. Si alguno de esos puntos tiene datos escritos, requiere
 *     confirmación explícita (`confirmar_datos = true`) antes de borrarlos.
 *
 * Modo por defecto (sin `confirmar`): devuelve un resumen (`dry_run`) sin
 * aplicar cambios. Con `confirmar = true` aplica los cambios.
 */
router.post(
  "/admin/actas/:id/sincronizar-convocatoria",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!puedeEscribir(user)) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const actaId = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(actaId)) {
      res.status(400).json({ error: "Id no válido" });
      return;
    }
    const confirmar = req.body?.confirmar === true;
    const confirmarDatos = req.body?.confirmar_datos === true;

    const client = await pool.connect();
    try {
      await ensureActasSchema();
      await client.query("BEGIN");

      const actaRes = await client.query(
        "SELECT * FROM db_actas WHERE id = $1 FOR UPDATE",
        [actaId],
      );
      if (actaRes.rowCount === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Acta no encontrada" });
        return;
      }
      const acta = actaRes.rows[0] as Record<string, unknown>;
      if (String(acta.estado) !== "borrador") {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "Solo se puede sincronizar un acta en borrador",
          estado: acta.estado,
        });
        return;
      }
      const convocatoriaId = acta.convocatoria_id != null ? Number(acta.convocatoria_id) : null;
      if (convocatoriaId == null || !Number.isFinite(convocatoriaId)) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "El acta no está vinculada a una convocatoria" });
        return;
      }

      // Puntos actuales de la convocatoria (con datos de propuesta enlazada).
      const conPropuestas = await propuestasDisponibles();
      const cpRes = await client.query(
        `SELECT cp.id, cp.orden, cp.propuesta_id, cp.titulo, cp.descripcion, cp.notas
                ${conPropuestas
                  ? ", p.denominacion AS prop_denominacion, p.descripcion AS prop_descripcion"
                  : ", NULL::varchar AS prop_denominacion, NULL::text AS prop_descripcion"}
           FROM db_convocatoria_puntos cp
           ${conPropuestas ? "LEFT JOIN db_propuestas_junta p ON p.id = cp.propuesta_id" : ""}
          WHERE cp.convocatoria_id = $1
          ORDER BY cp.orden, cp.id`,
        [convocatoriaId],
      );
      const cpRows = cpRes.rows as Record<string, unknown>[];
      const cpById = new Map<number, Record<string, unknown>>();
      for (const cp of cpRows) cpById.set(Number(cp.id), cp);

      // Puntos actuales del acta.
      const apRes = await client.query(
        `SELECT * FROM db_acta_puntos WHERE acta_id = $1 ORDER BY orden, id`,
        [actaId],
      );
      const apRows = apRes.rows as Record<string, unknown>[];
      const apByCp = new Map<number, Record<string, unknown>>();
      for (const ap of apRows) {
        if (ap.convocatoria_punto_id != null) {
          apByCp.set(Number(ap.convocatoria_punto_id), ap);
        }
      }

      // Añadidos: puntos de convocatoria sin punto de acta.
      const añadidos = cpRows.filter((cp) => !apByCp.has(Number(cp.id)));

      // Actualizados: puntos presentes en ambos con título/descripción distintos.
      const actualizados: Record<string, unknown>[] = [];
      for (const cp of cpRows) {
        const ap = apByCp.get(Number(cp.id));
        if (!ap) continue;
        const cpTitulo = String(cp.titulo ?? cp.prop_denominacion ?? "").trim() || null;
        const cpDescripcion = String(cp.descripcion ?? cp.prop_descripcion ?? "").trim() || null;
        const apTitulo = (ap.titulo as string | null) ?? null;
        const apDescripcion = (ap.descripcion as string | null) ?? null;
        if (cpTitulo !== apTitulo || cpDescripcion !== apDescripcion) {
          actualizados.push({ cp, ap, cpTitulo, cpDescripcion });
        }
      }

      // Eliminados: puntos de acta vinculados a un punto de convocatoria que ya
      // no existe. Los puntos libres (convocatoria_punto_id NULL) se conservan.
      const eliminados = apRows.filter(
        (ap) =>
          ap.convocatoria_punto_id != null &&
          !cpById.has(Number(ap.convocatoria_punto_id)),
      );
      const tieneDatos = (ap: Record<string, unknown>): boolean => {
        const acuerdo = String(ap.acuerdo ?? "").trim();
        const notas = String(ap.notas ?? "").trim();
        return (
          acuerdo.length > 0 ||
          notas.length > 0 ||
          ap.resultado_propuesta != null ||
          ap.expediente_accion != null ||
          ap.expediente_id != null
        );
      };
      const eliminadosConDatos = eliminados.filter(tieneDatos);

      // Si hay puntos con datos a eliminar y no se ha confirmado, no aplicamos
      // nada y pedimos confirmación.
      if (!confirmar || (eliminadosConDatos.length > 0 && !confirmarDatos)) {
        await client.query("ROLLBACK");
        res.json({
          ok: true,
          aplicado: false,
          requiere_confirmacion: eliminadosConDatos.length > 0,
          resumen: {
            anadidos: añadidos.length,
            actualizados: actualizados.length,
            eliminados: eliminados.length,
            eliminados_con_datos: eliminadosConDatos.length,
          },
          detalle: {
            anadidos: añadidos.map((cp) => ({
              convocatoria_punto_id: Number(cp.id),
              titulo: String(cp.titulo ?? cp.prop_denominacion ?? "").trim() || null,
            })),
            actualizados: actualizados.map((u) => ({
              acta_punto_id: Number((u.ap as Record<string, unknown>).id),
              titulo_anterior: (u.ap as Record<string, unknown>).titulo,
              titulo_nuevo: u.cpTitulo,
            })),
            eliminados: eliminados.map((ap) => ({
              acta_punto_id: Number(ap.id),
              titulo: ap.titulo,
              tiene_datos: tieneDatos(ap),
            })),
          },
        });
        return;
      }

      // ---- Aplicar cambios ----
      // 1) Añadir puntos nuevos.
      for (const cp of añadidos) {
        await client.query(
          `INSERT INTO db_acta_puntos
             (acta_id, convocatoria_punto_id, orden, propuesta_id, titulo, descripcion, notas)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            actaId,
            Number(cp.id),
            Number(cp.orden),
            cp.propuesta_id ?? null,
            String(cp.titulo ?? cp.prop_denominacion ?? "").trim() || null,
            String(cp.descripcion ?? cp.prop_descripcion ?? "").trim() || null,
            cp.notas ?? null,
          ],
        );
      }
      // 2) Actualizar título/descripción de los existentes.
      for (const u of actualizados) {
        await client.query(
          `UPDATE db_acta_puntos
              SET titulo = $1, descripcion = $2, actualizado_en = now()
            WHERE id = $3`,
          [u.cpTitulo, u.cpDescripcion, Number((u.ap as Record<string, unknown>).id)],
        );
      }
      // 3) Eliminar puntos que ya no están en la convocatoria.
      if (eliminados.length > 0) {
        const ids = eliminados.map((ap) => Number(ap.id));
        await client.query(
          `DELETE FROM db_acta_puntos WHERE acta_id = $1 AND id = ANY($2::int[])`,
          [actaId, ids],
        );
      }
      // 4) Renumerar `orden` según el orden actual de la convocatoria (los
      // puntos libres del acta se mantienen al final en su orden relativo).
      const finalRes = await client.query(
        `SELECT a.id,
                cp.orden AS cp_orden
           FROM db_acta_puntos a
           LEFT JOIN db_convocatoria_puntos cp ON cp.id = a.convocatoria_punto_id
          WHERE a.acta_id = $1
          ORDER BY (cp.orden IS NULL), cp.orden, a.orden, a.id`,
        [actaId],
      );
      let orden = 0;
      for (const row of finalRes.rows as Record<string, unknown>[]) {
        await client.query(
          `UPDATE db_acta_puntos SET orden = $1 WHERE id = $2`,
          [orden++, Number(row.id)],
        );
      }

      await client.query(
        "UPDATE db_actas SET actualizado_en = now() WHERE id = $1",
        [actaId],
      );

      await client.query("COMMIT");
      res.json({
        ok: true,
        aplicado: true,
        resumen: {
          anadidos: añadidos.length,
          actualizados: actualizados.length,
          eliminados: eliminados.length,
          eliminados_con_datos: eliminadosConDatos.length,
        },
      });
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {
        //
      }
      if (responderErrorEsquema(res, err)) return;
      console.error("[POST /admin/actas/:id/sincronizar-convocatoria]", err);
      res.status(500).json({ error: "Error sincronizando con la convocatoria", detalle: String(err) });
    } finally {
      client.release();
    }
  },
);

router.put("/admin/actas/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!puedeEscribir(user)) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id no válido" });
    return;
  }
  const body = req.body ?? {};
  try {
    await ensureActasSchema();
    const current = await pool.query("SELECT estado FROM db_actas WHERE id = $1", [id]);
    if (current.rowCount === 0) {
      res.status(404).json({ error: "Acta no encontrada" });
      return;
    }
    // Se puede editar la cabecera tanto en borrador como en completa. Las actas
    // firmadas son inmutables (su contenido va ligado al PDF firmado).
    const estadoActual = String(current.rows[0].estado);
    if (estadoActual !== "borrador" && estadoActual !== "completa") {
      res
        .status(409)
        .json({ error: "Solo se puede editar un acta en borrador o completa" });
      return;
    }
    const titulo = String(body.titulo ?? "").trim();
    if (body.titulo !== undefined && titulo.length < 2) {
      res.status(400).json({ error: "El título es obligatorio" });
      return;
    }
    // Cambio de estado permitido al guardar la cabecera: solo entre borrador y
    // completa (firmada se gestiona con su propio endpoint y subida de PDF).
    const estadoRaw = body.estado !== undefined ? String(body.estado).trim() : null;
    if (estadoRaw !== null && estadoRaw !== "borrador" && estadoRaw !== "completa") {
      res.status(400).json({ error: "estado debe ser 'borrador' o 'completa'" });
      return;
    }
    await pool.query(
      `UPDATE db_actas
          SET titulo = CASE WHEN $1::boolean THEN $2 ELSE titulo END,
              fecha = CASE WHEN $3::boolean THEN $4::date ELSE fecha END,
              asistentes = CASE WHEN $5::boolean THEN $6 ELSE asistentes END,
              resumen = CASE WHEN $7::boolean THEN $8 ELSE resumen END,
              observaciones = CASE WHEN $9::boolean THEN $10 ELSE observaciones END,
              estado = CASE WHEN $11::boolean THEN $12 ELSE estado END,
              completada_en = CASE
                                WHEN $11::boolean AND $12 = 'completa' THEN COALESCE(completada_en, now())
                                ELSE completada_en
                              END,
              actualizado_en = now()
        WHERE id = $13`,
      [
        body.titulo !== undefined,
        titulo,
        body.fecha !== undefined,
        String(body.fecha ?? "").trim() || null,
        body.asistentes !== undefined,
        String(body.asistentes ?? "").trim() || null,
        body.resumen !== undefined,
        String(body.resumen ?? "").trim() || null,
        body.observaciones !== undefined,
        String(body.observaciones ?? "").trim() || null,
        estadoRaw !== null,
        estadoRaw,
        id,
      ],
    );
    const updated = await pool.query("SELECT * FROM db_actas WHERE id = $1", [id]);
    res.json(mapActa(updated.rows[0]));
  } catch (err) {
    if (responderErrorEsquema(res, err)) return;
    console.error("[PUT /admin/actas/:id]", err);
    res.status(500).json({ error: "Error actualizando acta", detalle: String(err) });
  }
});

router.put(
  "/admin/actas/:id/puntos/:puntoId",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!puedeEscribir(user)) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const id = parseInt(String(req.params.id), 10);
    const puntoId = parseInt(String(req.params.puntoId), 10);
    if (!Number.isFinite(id) || !Number.isFinite(puntoId)) {
      res.status(400).json({ error: "Id no válido" });
      return;
    }
    const body = req.body ?? {};
    const resultadoRaw = String(body.resultado_propuesta ?? body.resultadoPropuesta ?? "").trim();
    const accionRaw = String(body.expediente_accion ?? body.expedienteAccion ?? "").trim();
    const resultado = resultadoRaw.length > 0 ? resultadoRaw : null;
    const expedienteAccion = accionRaw.length > 0 ? accionRaw : null;
    const expedienteIdRaw = body.expediente_id ?? body.expedienteId;
    const expedienteId =
      expedienteIdRaw != null && String(expedienteIdRaw).length > 0
        ? parseInt(String(expedienteIdRaw), 10)
        : null;

    if (resultado != null && !isResultado(resultado)) {
      res.status(400).json({ error: "resultado_propuesta no válido" });
      return;
    }
    if (expedienteAccion != null && !isExpedienteAccion(expedienteAccion)) {
      res.status(400).json({ error: "expediente_accion no válida" });
      return;
    }
    if (expedienteAccion === "abrir" && resultado !== "expediente_abierto") {
      res.status(400).json({
        error: "Para acción 'abrir', el resultado de la propuesta debe ser 'expediente_abierto'",
      });
      return;
    }

    try {
      await ensureActasSchema();
      const current = await pool.query(
        `SELECT a.estado, ap.id
           FROM db_actas a
           JOIN db_acta_puntos ap ON ap.acta_id = a.id
          WHERE a.id = $1 AND ap.id = $2`,
        [id, puntoId],
      );
      if (current.rowCount === 0) {
        res.status(404).json({ error: "Punto no encontrado" });
        return;
      }
      if (current.rows[0].estado !== "borrador") {
        res.status(409).json({ error: "Solo se pueden editar puntos en actas en borrador" });
        return;
      }
      await pool.query(
        `UPDATE db_acta_puntos
            SET acuerdo = $1,
                resultado_propuesta = $2,
                expediente_accion = $3,
                expediente_id = $4,
                notas = $5,
                actualizado_en = now()
          WHERE id = $6 AND acta_id = $7`,
        [
          String(body.acuerdo ?? "").trim() || null,
          resultado,
          expedienteAccion,
          Number.isFinite(expedienteId) ? expedienteId : null,
          String(body.notas ?? "").trim() || null,
          puntoId,
          id,
        ],
      );
      await pool.query("UPDATE db_actas SET actualizado_en = now() WHERE id = $1", [id]);
      res.json({ ok: true });
    } catch (err) {
      if (responderErrorEsquema(res, err)) return;
      console.error("[PUT /admin/actas/:id/puntos/:puntoId]", err);
      res.status(500).json({ error: "Error actualizando punto", detalle: String(err) });
    }
  },
);

router.post("/admin/actas/:id/completar", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!puedeEscribir(user)) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id no válido" });
    return;
  }
  const client = await pool.connect();
  try {
    await ensureActasSchema();
    await client.query("BEGIN");
    const actaRes = await client.query("SELECT * FROM db_actas WHERE id = $1 FOR UPDATE", [id]);
    if (actaRes.rowCount === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Acta no encontrada" });
      return;
    }
    if (actaRes.rows[0].estado !== "borrador") {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "Solo se puede completar un acta en borrador" });
      return;
    }

    const puntosRes = await client.query(
      `SELECT * FROM db_acta_puntos WHERE acta_id = $1 ORDER BY orden, id FOR UPDATE`,
      [id],
    );
    const pendientes = puntosRes.rows.filter(
      (p: Record<string, unknown>) => p.propuesta_id != null && p.resultado_propuesta == null,
    );
    if (pendientes.length > 0) {
      await client.query("ROLLBACK");
      res.status(409).json({
        error: "Hay puntos ligados a propuestas sin resultado",
        puntos_pendientes: pendientes.map((p: Record<string, unknown>) => p.id),
      });
      return;
    }

    // Validar: puntos con expediente_accion abrir/continuar deben tener
    // expediente_id (es decir, haberse procesado mediante los endpoints
    // "abrir-expediente" / "continuar-expediente" del módulo de expedientes).
    const pendientesExpediente = puntosRes.rows.filter(
      (p: Record<string, unknown>) =>
        (p.expediente_accion === "abrir" || p.expediente_accion === "continuar") &&
        p.expediente_id == null,
    );
    if (pendientesExpediente.length > 0) {
      await client.query("ROLLBACK");
      res.status(409).json({
        error:
          "Hay puntos con acción de expediente (abrir/continuar) sin materializar. Configúralos antes de completar el acta.",
        puntos_pendientes_expediente: pendientesExpediente.map(
          (p: Record<string, unknown>) => p.id,
        ),
      });
      return;
    }

    const ahora = new Date();
    const conPropuestasCompletar = await propuestasDisponibles();
    for (const punto of puntosRes.rows as Record<string, unknown>[]) {
      if (punto.propuesta_id == null || punto.resultado_propuesta == null) continue;
      // Sin tabla de buzón no hay propuestas que resolver.
      if (!conPropuestasCompletar) continue;
      const propuestaId = Number(punto.propuesta_id);
      const resultado = String(punto.resultado_propuesta);
      const propRes = await client.query(
        "SELECT * FROM db_propuestas_junta WHERE id = $1 FOR UPDATE",
        [propuestaId],
      );
      if (propRes.rowCount === 0) continue;
      const prop = propRes.rows[0] as Record<string, unknown>;
      const expedienteResultadoRaw =
        prop.origen_tipo === "subvencion" && prop.origen_id != null
          ? Number(prop.origen_id)
          : Number(punto.expediente_id);
      const expedienteResultadoId = Number.isFinite(expedienteResultadoRaw)
        ? expedienteResultadoRaw
        : null;
      const resultadoGestionaExpediente =
        resultado === "expediente_abierto" || resultado === "expediente_cerrado";

      await client.query(
        `UPDATE db_propuestas_junta
            SET estado_buzon = 'resuelta',
                resultado = $1,
                resuelta_en = $2,
                actualizado_en = $2,
                expediente_id = CASE WHEN $3::boolean THEN COALESCE($4, expediente_id) ELSE expediente_id END,
                observaciones = COALESCE($5, observaciones)
          WHERE id = $6`,
        [
          resultado,
          ahora,
          resultadoGestionaExpediente,
          expedienteResultadoId,
          punto.acuerdo ? String(punto.acuerdo) : null,
          propuestaId,
        ],
      );

      let nuevoEstadoSugerencia: "rechazada" | "aportaciones" | "planificada" | null = null;
      if (resultado === "rechazada") nuevoEstadoSugerencia = "rechazada";
      if (resultado === "mas_aportaciones") nuevoEstadoSugerencia = "aportaciones";
      if (resultado === "expediente_abierto") nuevoEstadoSugerencia = "planificada";

      if (
        prop.origen_tipo === "sugerencia" &&
        prop.origen_id != null &&
        nuevoEstadoSugerencia != null
      ) {
        const sugId = Number(prop.origen_id);
        if (Number.isFinite(sugId)) {
          await client.query(
            `UPDATE db_sugerencias
                SET estado = $1,
                    expediente_id = CASE WHEN $2::boolean THEN COALESCE($3, expediente_id) ELSE expediente_id END,
                    updated_at = $4
              WHERE id = $5`,
            [
              nuevoEstadoSugerencia,
              resultado === "expediente_abierto",
              expedienteResultadoId,
              ahora,
              sugId,
            ],
          );
          await client.query(
            "UPDATE db_sugerencias SET estado = $1, updated_at = $2 WHERE parent_id = $3",
            [nuevoEstadoSugerencia, ahora, sugId],
          );
        }
      }

      if (
        prop.origen_tipo === "subvencion" &&
        prop.origen_id != null &&
        expedienteResultadoId != null
      ) {
        if (resultado === "expediente_abierto") {
          await client.query(
            `UPDATE db_expedientes
                SET estado = 'en_curso',
                    propuesta_id = COALESCE(propuesta_id, $1),
                    actualizado_en = $2
              WHERE id = $3
                AND tipologia = 'subvenciones'
                AND estado = 'preparando'`,
            [propuestaId, ahora, expedienteResultadoId],
          );
          await client.query(
            `UPDATE db_expediente_subvencion
                SET subestado = CASE
                      WHEN subestado = 'preparando' THEN 'aprobada_junta'
                      ELSE subestado
                    END,
                    actualizado_en = $1
              WHERE expediente_id = $2`,
            [ahora, expedienteResultadoId],
          );
          await client.query(
            `INSERT INTO db_expediente_movimientos
               (expediente_id, tipo, acta_id, fecha, autor_user_id, notas)
             VALUES ($1, 'abrir', $2, now()::date, $3, $4)`,
            [
              expedienteResultadoId,
              id,
              Number.isFinite(user.uid) ? user.uid : null,
              punto.acuerdo ? String(punto.acuerdo) : "Aprobada presentación de subvención.",
            ],
          );
        }

        if (resultado === "rechazada" && prop.decision_solicitada === "abrir_expediente") {
          await client.query(
            `UPDATE db_expedientes
                SET estado = 'archivado',
                    actualizado_en = $1,
                    observaciones = COALESCE($2, observaciones)
              WHERE id = $3
                AND tipologia = 'subvenciones'
                AND estado = 'preparando'`,
            [ahora, punto.acuerdo ? String(punto.acuerdo) : null, expedienteResultadoId],
          );
        }

        if (resultado === "expediente_cerrado") {
          await client.query(
            `UPDATE db_expedientes
                SET estado = 'cerrado',
                    fecha_cierre = $1,
                    cerrado_por = $2,
                    actualizado_en = $1,
                    observaciones = COALESCE($3, observaciones)
              WHERE id = $4
                AND tipologia = 'subvenciones'
                AND estado <> 'cerrado'`,
            [
              ahora,
              Number.isFinite(user.uid) ? user.uid : null,
              punto.acuerdo ? String(punto.acuerdo) : null,
              expedienteResultadoId,
            ],
          );
          await client.query(
            `INSERT INTO db_expediente_movimientos
               (expediente_id, tipo, acta_id, fecha, autor_user_id, notas)
             VALUES ($1, 'cerrar', $2, now()::date, $3, $4)`,
            [
              expedienteResultadoId,
              id,
              Number.isFinite(user.uid) ? user.uid : null,
              punto.acuerdo ? String(punto.acuerdo) : "Aprobado cierre de subvención.",
            ],
          );
        }
      }
    }

    await client.query(
      `UPDATE db_actas
          SET estado = 'completa',
              completada_en = $1,
              actualizado_en = $1
        WHERE id = $2`,
      [ahora, id],
    );
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      //
    }
    if (responderErrorEsquema(res, err)) return;
    console.error("[POST /admin/actas/:id/completar]", err);
    res.status(500).json({ error: "Error completando acta", detalle: String(err) });
  } finally {
    client.release();
  }
});

async function ensureActaEnviosSchema(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS db_acta_envios (
        id              SERIAL PRIMARY KEY,
        acta_id         INTEGER NOT NULL,
        enviado_por     INTEGER,
        enviado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
        asunto          TEXT NOT NULL,
        mensaje         TEXT,
        destinatarios   JSONB NOT NULL DEFAULT '[]'::jsonb,
        total_destinos  INTEGER NOT NULL DEFAULT 0,
        ok              BOOLEAN NOT NULL DEFAULT true,
        error           TEXT
      )
    `);
    await pool.query(
      `CREATE INDEX IF NOT EXISTS db_acta_envios_acta_idx
         ON db_acta_envios (acta_id, enviado_en DESC)`,
    );
  } catch (e) {
    console.warn("[ensureActaEnviosSchema]", e);
  }
}

/** Usuarios con rol directivo/contable/delegado, para preseleccionar destinatarios. */
router.get(
  "/admin/actas/:id/destinatarios-junta",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!puedeEscribir(user)) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Id no válido" });
      return;
    }
    try {
      const rows = await pool.query(
        `SELECT DISTINCT u.id, u.nombre, u.username, u.email, r.code AS rol_destacado
           FROM db_users u
           JOIN db_user_roles ur ON ur.user_id = u.id
           JOIN db_roles r ON r.id = ur.role_id
          WHERE r.code IN ('directivo', 'contable', 'delegado')
            AND u.email IS NOT NULL
            AND length(trim(u.email)) > 0
          ORDER BY u.nombre NULLS LAST, u.username NULLS LAST`,
      );
      res.json({ items: rows.rows, total: rows.rowCount ?? rows.rows.length });
    } catch (err) {
      console.error("[GET /admin/actas/:id/destinatarios-junta]", err);
      res.status(500).json({ error: "Error", detalle: String(err) });
    }
  },
);

/** Buscador de socios para añadir manualmente como destinatarios. */
router.get(
  "/admin/actas/:id/buscar-socios",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!puedeEscribir(user)) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    try {
      const q = String(req.query.q ?? "").trim().toLowerCase();
      const params: unknown[] = [];
      let where = "WHERE u.email IS NOT NULL AND length(trim(u.email)) > 0";
      if (q.length > 0) {
        params.push(`%${q}%`);
        where += ` AND (
          LOWER(COALESCE(u.nombre,'')) LIKE $${params.length}
          OR LOWER(COALESCE(u.username,'')) LIKE $${params.length}
          OR LOWER(COALESCE(u.email,'')) LIKE $${params.length}
        )`;
      }
      const rows = await pool.query(
        `SELECT u.id, u.nombre, u.username, u.email,
                COALESCE(array_agg(DISTINCT r.code) FILTER (WHERE r.code IS NOT NULL), ARRAY[]::text[]) AS roles
           FROM db_users u
           LEFT JOIN db_user_roles ur ON ur.user_id = u.id
           LEFT JOIN db_roles r ON r.id = ur.role_id
           ${where}
          GROUP BY u.id
          ORDER BY u.nombre NULLS LAST, u.username NULLS LAST
          LIMIT 100`,
        params,
      );
      res.json({ items: rows.rows, total: rows.rowCount ?? rows.rows.length });
    } catch (err) {
      console.error("[GET /admin/actas/:id/buscar-socios]", err);
      res.status(500).json({ error: "Error", detalle: String(err) });
    }
  },
);

/** Historial de envíos. */
router.get(
  "/admin/actas/:id/envios",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!puedeLeer(user)) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Id no válido" });
      return;
    }
    try {
      await ensureActaEnviosSchema();
      const rows = await pool.query(
        `SELECT e.*, u.nombre AS enviado_por_nombre, u.username AS enviado_por_username
           FROM db_acta_envios e
           LEFT JOIN db_users u ON u.id = e.enviado_por
          WHERE e.acta_id = $1
          ORDER BY e.enviado_en DESC`,
        [id],
      );
      res.json({ items: rows.rows, total: rows.rowCount ?? rows.rows.length });
    } catch (err) {
      console.error("[GET /admin/actas/:id/envios]", err);
      res.status(500).json({ error: "Error", detalle: String(err) });
    }
  },
);

function renderActaHtml(args: {
  acta: Record<string, unknown>;
  puntos: Record<string, unknown>[];
  mensaje?: string | null;
}): string {
  const { acta, puntos, mensaje } = args;
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };
  const par = (v: unknown) => esc(v).replace(/\n/g, "<br/>");
  const banner =
    acta.estado !== "aceptada"
      ? `<div style="border:2px solid #b91c1c;color:#b91c1c;padding:6px 10px;display:inline-block;margin-bottom:12px;font-weight:bold;letter-spacing:0.1em;">BORRADOR — ${esc(acta.estado)}</div>`
      : "";
  const head =
    acta.numero != null ? `Acta n.º ${acta.numero}` : `Acta #${acta.id}`;

  const filasPuntos = puntos
    .map((p, idx) => {
      const titulo = (p.titulo as string) || (p.prop_denominacion as string) || `Punto ${idx + 1}`;
      const resultado = p.resultado_propuesta
        ? `<p><b>Resolución:</b> ${esc(p.resultado_propuesta)}</p>`
        : "";
      const accion = p.expediente_accion
        ? `<p><b>Acción sobre expediente:</b> ${esc(p.expediente_accion)}${
            p.expediente_id ? ` · expediente #${esc(p.expediente_id)}` : ""
          }</p>`
        : "";
      const acuerdo = p.acuerdo
        ? `<p><b>Acuerdo:</b><br/>${par(p.acuerdo)}</p>`
        : "<p><em>(sin acuerdo registrado)</em></p>";
      const notas = p.notas ? `<p style="color:#666;font-style:italic;">${par(p.notas)}</p>` : "";
      return `
        <li style="margin-bottom:14px;">
          <h4 style="margin:0 0 4px 0;">${idx + 1}. ${esc(titulo)}</h4>
          ${p.descripcion ? `<p style="color:#444;">${par(p.descripcion)}</p>` : ""}
          ${acuerdo}
          ${resultado}
          ${accion}
          ${notas}
        </li>`;
    })
    .join("");

  return `
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${esc(head)}</title>
</head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#222;line-height:1.45;max-width:800px;margin:24px auto;padding:0 16px;">
  ${banner}
  <h1 style="margin:0 0 4px 0;">${esc(head)}</h1>
  <h2 style="margin:0 0 10px 0;font-weight:normal;color:#555;">${esc(acta.titulo)}</h2>
  <p style="color:#555;margin:0 0 16px 0;">
    Estado: <b>${esc(acta.estado)}</b>
    ${acta.fecha ? ` · Fecha: ${esc(acta.fecha)}` : ""}
    ${acta.conv_titulo ? ` · Convocatoria: ${esc(acta.conv_titulo)}` : ""}
  </p>
  ${mensaje ? `<div style="background:#eef3ff;border:1px solid #c7d2fe;padding:10px;border-radius:6px;margin-bottom:16px;">${par(mensaje)}</div>` : ""}
  ${acta.asistentes ? `<p><b>Asistentes:</b><br/>${par(acta.asistentes)}</p>` : ""}
  ${acta.resumen ? `<p><b>Resumen:</b><br/>${par(acta.resumen)}</p>` : ""}
  ${acta.observaciones ? `<p><b>Observaciones:</b><br/>${par(acta.observaciones)}</p>` : ""}
  <h3>Puntos del orden del día y decisiones</h3>
  <ol>${filasPuntos || "<li><em>Sin puntos</em></li>"}</ol>
  <hr style="margin-top:24px;border:none;border-top:1px solid #ddd;"/>
  <p style="color:#888;font-size:12px;">Documento generado automáticamente desde el gestor de actas.</p>
</body>
</html>`;
}

function renderActaTexto(args: {
  acta: Record<string, unknown>;
  puntos: Record<string, unknown>[];
  mensaje?: string | null;
}): string {
  const { acta, puntos, mensaje } = args;
  const lines: string[] = [];
  if (acta.estado !== "aceptada") {
    lines.push(`*** BORRADOR — estado: ${acta.estado} ***`);
    lines.push("");
  }
  lines.push(acta.numero != null ? `Acta n.º ${acta.numero}` : `Acta #${acta.id}`);
  lines.push(String(acta.titulo ?? ""));
  lines.push(
    `Estado: ${acta.estado}${acta.fecha ? ` · Fecha: ${acta.fecha}` : ""}${
      acta.conv_titulo ? ` · Convocatoria: ${acta.conv_titulo}` : ""
    }`,
  );
  lines.push("");
  if (mensaje) {
    lines.push(String(mensaje));
    lines.push("");
  }
  if (acta.asistentes) lines.push(`Asistentes:\n${acta.asistentes}\n`);
  if (acta.resumen) lines.push(`Resumen:\n${acta.resumen}\n`);
  if (acta.observaciones) lines.push(`Observaciones:\n${acta.observaciones}\n`);
  lines.push("Puntos del orden del día y decisiones:");
  puntos.forEach((p, idx) => {
    const titulo = (p.titulo as string) || (p.prop_denominacion as string) || `Punto ${idx + 1}`;
    lines.push(`\n${idx + 1}. ${titulo}`);
    if (p.descripcion) lines.push(`   ${p.descripcion}`);
    if (p.acuerdo) lines.push(`   Acuerdo: ${p.acuerdo}`);
    if (p.resultado_propuesta) lines.push(`   Resolución: ${p.resultado_propuesta}`);
    if (p.expediente_accion) {
      lines.push(
        `   Expediente: ${p.expediente_accion}${
          p.expediente_id ? ` (#${p.expediente_id})` : ""
        }`,
      );
    }
    if (p.notas) lines.push(`   Notas: ${p.notas}`);
  });
  return lines.join("\n");
}

/**
 * Enviar el acta por email. Solo si el acta está firmada.
 * Body: { asunto?, mensaje?, destinatarios_user_ids?: number[], destinatarios_emails?: string[], replyTo? }
 */
router.post("/admin/actas/:id/enviar-email", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!puedeEscribir(user)) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id no válido" });
    return;
  }
  const body = req.body ?? {};
  const userIds = Array.isArray(body.destinatarios_user_ids)
    ? body.destinatarios_user_ids
        .map((x: unknown) => parseInt(String(x), 10))
        .filter((x: number) => Number.isFinite(x))
    : [];
  const emailsLibres = Array.isArray(body.destinatarios_emails)
    ? body.destinatarios_emails.map((x: unknown) => String(x ?? "").trim()).filter((x: string) => x.length > 0)
    : [];
  if (userIds.length === 0 && emailsLibres.length === 0) {
    res.status(400).json({ error: "Selecciona al menos un destinatario." });
    return;
  }
  try {
    await ensureActasSchema();
    await ensureActaEnviosSchema();
    const actaRes = await pool.query(
      `SELECT a.*, c.numero AS conv_numero, c.titulo AS conv_titulo
         FROM db_actas a
         LEFT JOIN db_convocatorias c ON c.id = a.convocatoria_id
        WHERE a.id = $1`,
      [id],
    );
    if (actaRes.rowCount === 0) {
      res.status(404).json({ error: "Acta no encontrada" });
      return;
    }
    const acta = actaRes.rows[0] as Record<string, unknown>;
    if (acta.estado !== "aceptada") {
      res.status(409).json({
        error: "Solo se puede enviar por email un acta firmada (aceptada).",
        estado: acta.estado,
      });
      return;
    }
    const conPropuestas = await propuestasDisponibles();
    const puntosRes = await pool.query(
      `SELECT ap.*
              ${conPropuestas
                ? `, p.denominacion AS prop_denominacion,
                    p.descripcion AS prop_descripcion`
                : `, NULL::varchar AS prop_denominacion,
                    NULL::text AS prop_descripcion`}
         FROM db_acta_puntos ap
         ${conPropuestas ? "LEFT JOIN db_propuestas_junta p ON p.id = ap.propuesta_id" : ""}
        WHERE ap.acta_id = $1
        ORDER BY ap.orden, ap.id`,
      [id],
    );

    let destinatarios: { email: string; nombre?: string; user_id?: number }[] = [];
    if (userIds.length > 0) {
      const usuariosRes = await pool.query(
        `SELECT id, nombre, email FROM db_users WHERE id = ANY($1::int[]) AND email IS NOT NULL AND length(trim(email)) > 0`,
        [userIds],
      );
      destinatarios = usuariosRes.rows.map((r) => ({
        email: String(r.email).trim(),
        nombre: r.nombre ? String(r.nombre) : undefined,
        user_id: Number(r.id),
      }));
    }
    for (const e of emailsLibres) {
      if (!destinatarios.some((d) => d.email.toLowerCase() === e.toLowerCase())) {
        destinatarios.push({ email: e });
      }
    }
    if (destinatarios.length === 0) {
      res.status(400).json({ error: "Ningún destinatario tiene email válido." });
      return;
    }

    const asuntoDefault = `Acta ${acta.numero ?? `#${acta.id}`} — ${acta.titulo ?? ""}`.trim();
    const asunto = String(body.asunto ?? asuntoDefault).trim() || asuntoDefault;
    const mensaje = String(body.mensaje ?? "").trim() || null;
    const html = renderActaHtml({ acta, puntos: puntosRes.rows, mensaje });
    const text = renderActaTexto({ acta, puntos: puntosRes.rows, mensaje });

    const result = await sendActaEmail({
      to: destinatarios.map((d) => d.email),
      subject: asunto,
      text,
      html,
      replyTo: body.replyTo ? String(body.replyTo) : undefined,
    });

    await pool.query(
      `INSERT INTO db_acta_envios
         (acta_id, enviado_por, asunto, mensaje, destinatarios, total_destinos, ok, error)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)`,
      [
        id,
        Number.isFinite(user.uid) ? user.uid : null,
        asunto,
        mensaje,
        JSON.stringify(destinatarios),
        destinatarios.length,
        result.ok,
        result.error ?? null,
      ],
    );

    if (!result.ok) {
      res.status(500).json({ ok: false, error: result.error, total: destinatarios.length });
      return;
    }
    res.json({ ok: true, simulado: !!result.simulado, total: destinatarios.length });
  } catch (err) {
    console.error("[POST /admin/actas/:id/enviar-email]", err);
    res.status(500).json({ error: "Error enviando email", detalle: String(err) });
  }
});

/* ---------- Histórico público de actas firmadas (acceso autenticado) ---------- */

function puedeVerHistorico(user: { role?: string; roles?: string[] }): boolean {
  return hasAnyRole(user, "socio", "delegado", "directivo", "contable", "administrador");
}

router.get("/actas-firmadas", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!puedeVerHistorico(user)) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }
  try {
    await ensureActasSchema();
    const filters: string[] = [`a.estado = 'aceptada'`];
    const params: unknown[] = [];

    // Filtro por año de archivo (p.pdf_anyo_mes, YYYY-MM).
    const anio = String(req.query.anio ?? "").trim();
    if (/^\d{4}$/.test(anio)) {
      params.push(`${anio}-%`);
      filters.push(`p.pdf_anyo_mes LIKE $${params.length}`);
    }

    // Filtro por año-mes completo (YYYY-MM).
    const anyoMes = normalizarAnyoMes(req.query.anyo_mes ?? req.query.anyoMes);
    if (anyoMes) {
      params.push(anyoMes);
      filters.push(`p.pdf_anyo_mes = $${params.length}`);
    }

    // Filtro por tema/texto: título del acta o contenido de los puntos
    // (título, descripción o acuerdo), case-insensitive.
    const q = String(req.query.q ?? "").trim();
    if (q.length > 0) {
      params.push(`%${q}%`);
      const p = params.length;
      filters.push(`(
        a.titulo ILIKE $${p}
        OR EXISTS (
          SELECT 1 FROM db_acta_puntos ap
           WHERE ap.acta_id = a.id
             AND (
               COALESCE(ap.titulo, '') ILIKE $${p}
               OR COALESCE(ap.descripcion, '') ILIKE $${p}
               OR COALESCE(ap.acuerdo, '') ILIKE $${p}
             )
        )
      )`);
    }

    const where = `WHERE ${filters.join(" AND ")}`;
    const rows = await pool.query(
      `SELECT a.id, a.numero, a.titulo, a.fecha, a.firmada_en,
              p.pdf_url, p.pdf_filename, p.pdf_anyo_mes,
              c.numero AS conv_numero, c.titulo AS conv_titulo, c.tipo AS conv_tipo
         FROM db_actas a
         LEFT JOIN db_convocatorias c ON c.id = a.convocatoria_id
         LEFT JOIN db_actas_pdf p ON p.acta_id = a.id
        ${where}
        ORDER BY a.fecha DESC NULLS LAST, a.firmada_en DESC NULLS LAST`,
      params,
    );
    res.json({ items: rows.rows, total: rows.rowCount ?? rows.rows.length });
  } catch (err) {
    console.error("[GET /actas-firmadas]", err);
    res.status(500).json({ error: "Error", detalle: String(err) });
  }
});

router.get("/actas-firmadas/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!puedeVerHistorico(user)) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id no válido" });
    return;
  }
  try {
    await ensureActasSchema();
    const actaRes = await pool.query(
      `SELECT a.*, c.numero AS conv_numero, c.titulo AS conv_titulo,
              c.tipo AS conv_tipo, c.fecha AS conv_fecha, c.hora AS conv_hora, c.lugar AS conv_lugar,
              p.pdf_url AS pdf_pdf_url, p.pdf_filename AS pdf_pdf_filename,
              p.pdf_anyo_mes AS pdf_pdf_anyo_mes, p.pdf_size AS pdf_pdf_size,
              p.subido_en AS pdf_pdf_subido_en, p.subido_por AS pdf_pdf_subido_por
         FROM db_actas a
         LEFT JOIN db_convocatorias c ON c.id = a.convocatoria_id
         LEFT JOIN db_actas_pdf p ON p.acta_id = a.id
        WHERE a.id = $1 AND a.estado = 'aceptada'`,
      [id],
    );
    if (actaRes.rowCount === 0) {
      res.status(404).json({ error: "Acta no encontrada o no firmada" });
      return;
    }
    const conPropuestas = await propuestasDisponibles();
    const puntosRes = await pool.query(
      `SELECT ap.*
              ${conPropuestas
                ? `, p.denominacion AS prop_denominacion,
                    p.descripcion AS prop_descripcion,
                    p.decision_solicitada AS prop_decision_solicitada,
                    p.resultado AS prop_resultado,
                    p.expediente_id AS prop_expediente_id`
                : `, NULL::varchar AS prop_denominacion,
                    NULL::text AS prop_descripcion,
                    NULL::varchar AS prop_decision_solicitada,
                    NULL::varchar AS prop_resultado,
                    NULL::int AS prop_expediente_id`}
         FROM db_acta_puntos ap
         ${conPropuestas ? "LEFT JOIN db_propuestas_junta p ON p.id = ap.propuesta_id" : ""}
        WHERE ap.acta_id = $1
        ORDER BY ap.orden, ap.id`,
      [id],
    );
    res.json({
      acta: mapActa(actaRes.rows[0]),
      puntos: puntosRes.rows.map(mapPunto),
    });
  } catch (err) {
    console.error("[GET /actas-firmadas/:id]", err);
    res.status(500).json({ error: "Error", detalle: String(err) });
  }
});

/**
 * Previsualizar las actas firmadas del mismo año-mes que un acta concreta.
 *
 * Permite al frontend advertir al firmar si ya hay otras actas firmadas en el
 * mismo mes (cosa válida y frecuente; solo aviso al usuario y, en archivo, se
 * añade un sufijo secuencial al nombre del PDF).
 */
router.get(
  "/admin/actas/:id/duplicados-mes",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!puedeLeer(user)) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Id no válido" });
      return;
    }
    try {
      await ensureActasSchema();
      const current = await pool.query(
        "SELECT id, fecha, titulo FROM db_actas WHERE id = $1",
        [id],
      );
      if (current.rowCount === 0) {
        res.status(404).json({ error: "Acta no encontrada" });
        return;
      }
      const anyoMes =
        normalizarAnyoMes(req.query.anyo_mes) ??
        anyoMesDe(current.rows[0].fecha as string | null);
      const rows = await pool.query(
        `SELECT a.id, a.numero, a.titulo, a.fecha, p.pdf_filename, p.pdf_url
           FROM db_actas a
           JOIN db_actas_pdf p ON p.acta_id = a.id
          WHERE a.estado = 'aceptada'
            AND p.pdf_anyo_mes = $1
            AND a.id <> $2
          ORDER BY a.fecha DESC NULLS LAST, a.firmada_en DESC NULLS LAST`,
        [anyoMes, id],
      );
      res.json({
        anyo_mes: anyoMes,
        items: rows.rows,
        total: rows.rowCount ?? rows.rows.length,
      });
    } catch (err) {
      console.error("[GET /admin/actas/:id/duplicados-mes]", err);
      res.status(500).json({ error: "Error", detalle: String(err) });
    }
  },
);

/**
 * Firmar el acta. Requiere subir el PDF firmado (data URL `application/pdf`).
 *
 * - El acta debe estar en estado `completa`.
 * - El PDF se guarda bajo `uploads/actas/YYYY/MM/<anyo-mes>-<slug>[-N].pdf`.
 * - Si ya existían otras actas firmadas del mismo mes, el nombre recibe sufijo
 *   secuencial y la respuesta incluye `duplicados_mes` con la lista para que
 *   la UI muestre la advertencia.
 */
router.post("/admin/actas/:id/firmar", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!puedeEscribir(user)) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id no válido" });
    return;
  }
  const body = req.body ?? {};
  const pdfDataUrl = String(body.pdf_data_url ?? "").trim();
  if (!pdfDataUrl) {
    res.status(400).json({
      error: "Falta el PDF firmado. Adjunta el archivo antes de firmar.",
    });
    return;
  }
  try {
    await ensureActasSchema();
    const current = await pool.query(
      "SELECT id, estado, titulo, fecha FROM db_actas WHERE id = $1",
      [id],
    );
    if (current.rowCount === 0) {
      res.status(404).json({ error: "Acta no encontrada" });
      return;
    }
    const cur = current.rows[0];
    if (cur.estado !== "completa") {
      res.status(409).json({ error: "Solo se puede firmar un acta completa" });
      return;
    }
    // Año-mes de archivo: opcional. Si el cliente lo envía debe ser válido
    // (`YYYY-MM`); si no, se deriva de la fecha del acta.
    const anyoMesBodyRaw =
      body.anyo_mes !== undefined && body.anyo_mes !== null && String(body.anyo_mes).trim() !== ""
        ? String(body.anyo_mes).trim()
        : null;
    const anyoMesBody = normalizarAnyoMes(anyoMesBodyRaw);
    if (anyoMesBodyRaw && !anyoMesBody) {
      res.status(400).json({ error: "anyo_mes debe tener el formato YYYY-MM." });
      return;
    }
    let persisted;
    try {
      persisted = await persistActaPdf({
        pdfDataUrl,
        fecha: cur.fecha as string | null,
        titulo: String(cur.titulo ?? ""),
        anyoMes: anyoMesBody,
      });
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message ?? e) });
      return;
    }
    const duplicados = await pool.query(
      `SELECT a.id, a.numero, a.titulo, a.fecha, p.pdf_filename, p.pdf_url
         FROM db_actas a
         JOIN db_actas_pdf p ON p.acta_id = a.id
        WHERE a.estado = 'aceptada'
          AND p.pdf_anyo_mes = $1
          AND a.id <> $2
        ORDER BY a.fecha DESC NULLS LAST, a.firmada_en DESC NULLS LAST`,
      [persisted.anyoMes, id],
    );

    // El acta pasa a 'aceptada' (tiene PDF firmado) y el PDF se archiva en
    // `db_actas_pdf` (relación 1:1, upsert por si se re-firma).
    await pool.query(
      `UPDATE db_actas
          SET estado = 'aceptada',
              firmada_en = now(),
              actualizado_en = now()
        WHERE id = $1`,
      [id],
    );
    await pool.query(
      `INSERT INTO db_actas_pdf
         (acta_id, pdf_url, pdf_filename, pdf_anyo_mes, pdf_size, subido_en, subido_por)
       VALUES ($1, $2, $3, $4, $5, now(), $6)
       ON CONFLICT (acta_id) DO UPDATE
         SET pdf_url = EXCLUDED.pdf_url,
             pdf_filename = EXCLUDED.pdf_filename,
             pdf_anyo_mes = EXCLUDED.pdf_anyo_mes,
             pdf_size = EXCLUDED.pdf_size,
             subido_en = now(),
             subido_por = EXCLUDED.subido_por,
             actualizado_en = now()`,
      [
        id,
        persisted.url,
        persisted.filename,
        persisted.anyoMes,
        persisted.bytes,
        Number.isFinite(user.uid) ? user.uid : null,
      ],
    );
    res.json({
      ok: true,
      pdf_url: persisted.url,
      pdf_filename: persisted.filename,
      pdf_anyo_mes: persisted.anyoMes,
      pdf_size: persisted.bytes,
      suffix: persisted.suffix,
      duplicados_mes: duplicados.rows,
    });
  } catch (err) {
    if (responderErrorEsquema(res, err)) return;
    console.error("[POST /admin/actas/:id/firmar]", err);
    res.status(500).json({ error: "Error firmando acta", detalle: String(err) });
  }
});

/**
 * Archivar un PDF firmado creando el acta completa de otro año-mes.
 *
 * Caso de uso: el PDF firmado pertenece a un acta que no está en el listado
 * (de otro año-mes) o que se elabora aquí mismo. Se crea el acta con el título
 * `Acta: Mes de "<mes>" de <año>` en estado `aceptada`, sin pasarla por el
 * flujo borrador → completa, y se archiva el PDF en `uploads/actas/YYYY/MM/`.
 *
 * Body: { anyo_mes: 'YYYY-MM', pdf_data_url, titulo? }
 */
router.post("/admin/actas/firmar-otro-mes", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!puedeEscribir(user)) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }
  const body = req.body ?? {};
  const anyoMes = normalizarAnyoMes(body.anyo_mes ?? body.anyoMes);
  if (!anyoMes) {
    res.status(400).json({ error: "Indica un año-mes válido (formato YYYY-MM)." });
    return;
  }
  const pdfDataUrl = String(body.pdf_data_url ?? "").trim();
  if (!pdfDataUrl) {
    res.status(400).json({
      error: "Falta el PDF firmado. Adjunta el archivo antes de firmar.",
    });
    return;
  }
  const titulo =
    String(body.titulo ?? "").trim() || tituloActaAnyoMes(anyoMes);
  const fecha = primerDiaAnyoMes(anyoMes);

  let persisted;
  try {
    persisted = await persistActaPdf({
      pdfDataUrl,
      fecha,
      titulo,
      anyoMes,
    });
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message ?? e) });
    return;
  }

  const client = await pool.connect();
  try {
    await ensureActasSchema();
    await client.query("BEGIN");
    const inserted = await client.query(
      `INSERT INTO db_actas
         (numero, convocatoria_id, titulo, fecha, estado, completada_en, firmada_en,
          actualizado_en, creado_por)
       VALUES (nextval('db_actas_numero_seq')::int, NULL, $1, $2::date, 'aceptada', now(), now(),
               now(), $3)
       RETURNING *`,
      [
        titulo,
        fecha,
        Number.isFinite(user.uid) ? user.uid : null,
      ],
    );
    const actaId = Number(inserted.rows[0].id);
    await client.query(
      `INSERT INTO db_actas_pdf
         (acta_id, pdf_url, pdf_filename, pdf_anyo_mes, pdf_size, subido_en, subido_por)
       VALUES ($1, $2, $3, $4, $5, now(), $6)`,
      [
        actaId,
        persisted.url,
        persisted.filename,
        persisted.anyoMes,
        persisted.bytes,
        Number.isFinite(user.uid) ? user.uid : null,
      ],
    );
    await client.query("COMMIT");
    // El acta recién creada se devuelve con los datos del PDF ya asociados.
    const fila = {
      ...inserted.rows[0],
      pdf_pdf_url: persisted.url,
      pdf_pdf_filename: persisted.filename,
      pdf_pdf_anyo_mes: persisted.anyoMes,
      pdf_pdf_size: persisted.bytes,
      pdf_pdf_subido_en: new Date(),
      pdf_pdf_subido_por: Number.isFinite(user.uid) ? user.uid : null,
    };
    res.status(201).json({
      ok: true,
      acta: mapActa(fila),
      pdf_url: persisted.url,
      pdf_filename: persisted.filename,
      pdf_anyo_mes: persisted.anyoMes,
      pdf_size: persisted.bytes,
      suffix: persisted.suffix,
    });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      //
    }
    if (responderErrorEsquema(res, err)) return;
    console.error("[POST /admin/actas/firmar-otro-mes]", err);
    res.status(500).json({ error: "Error archivando el acta", detalle: String(err) });
  } finally {
    client.release();
  }
});

export default router;
