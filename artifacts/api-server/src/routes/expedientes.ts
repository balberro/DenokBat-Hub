import { Router, type IRouter } from "express";
import { db, pool } from "@workspace/db";
import {
  expedientesTable,
  expedienteMovimientosTable,
  propuestasJuntaTable,
  sugerenciasTable,
  EXPEDIENTE_ESTADOS,
  EXPEDIENTE_TIPOLOGIAS,
  EXPEDIENTE_ACCION_ESTADOS,
  type ExpedienteEstado,
  type ExpedienteTipologia,
  type ExpedienteAccionEstado,
} from "@workspace/db/schema";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import {
  deleteExpedienteDocumentoFile,
  persistExpedienteDocumentoPdf,
} from "../lib/expedienteDocumentos";

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

function isEstado(s: string): s is ExpedienteEstado {
  return (EXPEDIENTE_ESTADOS as readonly string[]).includes(s);
}

function isTipologia(s: string): s is ExpedienteTipologia {
  return (EXPEDIENTE_TIPOLOGIAS as readonly string[]).includes(s);
}

function isAccionEstado(s: string): s is ExpedienteAccionEstado {
  return (EXPEDIENTE_ACCION_ESTADOS as readonly string[]).includes(s);
}

async function ensureExpedienteAccionesSchema(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS db_expediente_acciones (
        id                    SERIAL PRIMARY KEY,
        expediente_id         INTEGER NOT NULL,
        movimiento_id         INTEGER,
        descripcion           TEXT NOT NULL,
        responsable_user_id   INTEGER,
        estado                VARCHAR(20) NOT NULL DEFAULT 'pendiente',
        plazo                 DATE,
        observaciones         TEXT,
        completada_en         TIMESTAMPTZ,
        creado_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
        actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
        creado_por            INTEGER
      )
    `);
    await pool.query(
      `CREATE INDEX IF NOT EXISTS db_expediente_acciones_expediente_idx
         ON db_expediente_acciones (expediente_id, creado_en DESC)`,
    );
  } catch (e) {
    console.warn("[ensureExpedienteAccionesSchema]", e);
  }
}

async function ensureExpedienteDocumentosSchema(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS db_expediente_documentos (
        id              SERIAL PRIMARY KEY,
        expediente_id   INTEGER NOT NULL,
        tipo            VARCHAR(40) NOT NULL DEFAULT 'otros',
        origen          VARCHAR(20) NOT NULL DEFAULT 'flujo',
        denominacion    VARCHAR(500),
        url             TEXT NOT NULL,
        filename        VARCHAR(255),
        size            INTEGER,
        fecha_documento DATE,
        importe         NUMERIC(14,2),
        notas           TEXT,
        subido_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
        subido_por      INTEGER,
        creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query(
      `ALTER TABLE db_expediente_documentos
         ADD COLUMN IF NOT EXISTS origen VARCHAR(20) NOT NULL DEFAULT 'flujo'`,
    );
    await pool.query(`
      CREATE INDEX IF NOT EXISTS db_expediente_documentos_expediente_idx
        ON db_expediente_documentos (expediente_id, subido_en DESC)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS db_expediente_documentos_tipo_idx
        ON db_expediente_documentos (tipo, subido_en DESC)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS db_expediente_documentos_origen_idx
        ON db_expediente_documentos (origen, expediente_id)
    `);
  } catch (e) {
    console.warn("[ensureExpedienteDocumentosSchema]", e);
  }
}

/**
 * Estados en los que el expediente se considera "activo" (en proceso). Los
 * documentos subidos en estos estados se marcan como `origen='flujo'`. En el
 * resto (`cerrado`, `archivado`), se marcan como `origen='historico'` y son los
 * únicos que se pueden borrar a posteriori.
 */
const ESTADOS_ACTIVOS = new Set(["en_curso", "preparando"]);

function origenSegunEstado(estado: string | null | undefined): "flujo" | "historico" {
  return ESTADOS_ACTIVOS.has(String(estado ?? "")) ? "flujo" : "historico";
}

type AccionInput = {
  descripcion: string;
  responsable_user_id: number | null;
  plazo: string | null;
  observaciones: string | null;
};

function parseAccionInput(raw: unknown): AccionInput | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "acción no válida" };
  const obj = raw as Record<string, unknown>;
  const descripcion = String(obj.descripcion ?? "").trim();
  if (descripcion.length < 2) {
    return { error: "descripcion obligatoria (mín. 2 caracteres)" };
  }
  const respRaw = obj.responsable_user_id ?? obj.responsableUserId;
  const respId =
    respRaw != null && String(respRaw).length > 0 ? parseInt(String(respRaw), 10) : null;
  if (respRaw != null && String(respRaw).length > 0 && !Number.isFinite(respId)) {
    return { error: "responsable_user_id no válido" };
  }
  const plazoRaw = String(obj.plazo ?? "").trim();
  const plazo = plazoRaw.length > 0 ? plazoRaw : null;
  const observaciones = String(obj.observaciones ?? "").trim() || null;
  return { descripcion, responsable_user_id: respId, plazo, observaciones };
}

function mapAccion(row: Record<string, unknown>) {
  return {
    id: row.id,
    expediente_id: row.expediente_id,
    movimiento_id: row.movimiento_id,
    descripcion: row.descripcion,
    responsable_user_id: row.responsable_user_id,
    responsable_nombre: row.responsable_nombre ?? null,
    responsable_username: row.responsable_username ?? null,
    estado: row.estado,
    plazo: row.plazo,
    observaciones: row.observaciones,
    completada_en: row.completada_en,
    creado_en: row.creado_en,
    actualizado_en: row.actualizado_en,
    creado_por: row.creado_por,
  };
}

function mapDocumento(row: Record<string, unknown>) {
  return {
    id: row.id,
    expediente_id: row.expediente_id,
    tipo: row.tipo,
    origen: row.origen ?? "flujo",
    denominacion: row.denominacion,
    url: row.url,
    filename: row.filename,
    size: row.size,
    fecha_documento: row.fecha_documento,
    importe: row.importe,
    notas: row.notas,
    subido_en: row.subido_en,
    subido_por: row.subido_por,
    creado_en: row.creado_en,
  };
}

async function ensureExpedientesSchema(): Promise<void> {
  try {
    await pool.query(`CREATE SEQUENCE IF NOT EXISTS db_expedientes_numero_seq`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS db_expedientes (
        id                SERIAL PRIMARY KEY,
        numero            INTEGER UNIQUE,
        denominacion      VARCHAR(500) NOT NULL,
        descripcion       TEXT NOT NULL,
        tipologia         VARCHAR(50) NOT NULL DEFAULT 'sugerencias',
        estado            VARCHAR(30) NOT NULL DEFAULT 'en_curso',
        propuesta_id      INTEGER UNIQUE,
        fecha_apertura    TIMESTAMPTZ NOT NULL DEFAULT now(),
        fecha_cierre      TIMESTAMPTZ,
        observaciones     TEXT,
        creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
        actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
        creado_por        INTEGER,
        cerrado_por       INTEGER
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS db_expediente_movimientos (
        id              SERIAL PRIMARY KEY,
        expediente_id   INTEGER NOT NULL,
        tipo            VARCHAR(20) NOT NULL,
        acta_id         INTEGER,
        fecha           DATE NOT NULL DEFAULT (now()::date),
        autor_user_id   INTEGER,
        notas           TEXT,
        creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS db_expedientes_estado_idx
        ON db_expedientes (estado, creado_en DESC);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS db_expedientes_tipologia_idx
        ON db_expedientes (tipologia);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS db_expediente_movimientos_expediente_idx
        ON db_expediente_movimientos (expediente_id, fecha DESC, id DESC);
    `);
  } catch (e) {
    console.warn("[ensureExpedientesSchema]", e);
  }
}

type ExpedienteRow = typeof expedientesTable.$inferSelect;
type MovimientoRow = typeof expedienteMovimientosTable.$inferSelect;

function mapExpediente(row: ExpedienteRow) {
  return {
    id: row.id,
    numero: row.numero,
    denominacion: row.denominacion,
    descripcion: row.descripcion,
    tipologia: row.tipologia,
    estado: row.estado,
    propuesta_id: row.propuestaId,
    fecha_apertura: row.fechaApertura,
    fecha_cierre: row.fechaCierre,
    observaciones: row.observaciones,
    creado_en: row.creadoEn,
    actualizado_en: row.actualizadoEn,
    creado_por: row.creadoPor,
    cerrado_por: row.cerradoPor,
  };
}

function mapMovimiento(row: MovimientoRow) {
  return {
    id: row.id,
    expediente_id: row.expedienteId,
    tipo: row.tipo,
    acta_id: row.actaId,
    fecha: row.fecha,
    autor_user_id: row.autorUserId,
    notas: row.notas,
    creado_en: row.creadoEn,
  };
}

/** Listar expedientes (cualquier rol con acceso al gestor). */
router.get("/admin/expedientes", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!hasAnyRole(user, "directivo", "contable")) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }
  try {
    await ensureExpedientesSchema();
    const filters: ReturnType<typeof eq>[] = [];
    const { estado, tipologia } = req.query;
    if (typeof estado === "string" && isEstado(estado)) {
      filters.push(eq(expedientesTable.estado, estado));
    }
    if (typeof tipologia === "string" && isTipologia(tipologia)) {
      filters.push(eq(expedientesTable.tipologia, tipologia));
    }
    const rows =
      filters.length === 0
        ? await db
            .select()
            .from(expedientesTable)
            .orderBy(desc(expedientesTable.creadoEn))
        : await db
            .select()
            .from(expedientesTable)
            .where(and(...filters))
            .orderBy(desc(expedientesTable.creadoEn));

    res.json({ items: rows.map(mapExpediente), total: rows.length });
  } catch (err) {
    console.error("[GET /admin/expedientes]", err);
    res.status(500).json({ error: "Error consultando expedientes", detalle: String(err) });
  }
});

/**
 * Listado auxiliar para la UI: propuestas a la junta resueltas como
 * `expediente_abierto` que aún no tienen expediente asociado.
 * (Ruta estática antes de /:id para que Express no la confunda con un id.)
 */
router.get(
  "/admin/expedientes/propuestas-pendientes-abrir",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!hasAnyRole(user, "directivo", "contable")) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    try {
      await ensureExpedientesSchema();
      const rows = await db
        .select()
        .from(propuestasJuntaTable)
        .where(
          and(
            eq(propuestasJuntaTable.estadoBuzon, "resuelta"),
            eq(propuestasJuntaTable.resultado, "expediente_abierto"),
          ),
        )
        .orderBy(desc(propuestasJuntaTable.resueltaEn));
      const items = rows
        .filter((p) => p.expedienteId == null)
        .map((p) => ({
          id: p.id,
          denominacion: p.denominacion,
          descripcion: p.descripcion,
          origen_tipo: p.origenTipo,
          origen_id: p.origenId,
          resuelta_en: p.resueltaEn,
        }));
      res.json({ items, total: items.length });
    } catch (err) {
      console.error("[GET .../propuestas-pendientes-abrir]", err);
      res.status(500).json({ error: "Error", detalle: String(err) });
    }
  },
);

/** Ficha + movimientos. */
router.get("/admin/expedientes/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!hasAnyRole(user, "directivo", "contable")) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id no válido" });
    return;
  }
  try {
    await ensureExpedientesSchema();
    const [exp] = await db
      .select()
      .from(expedientesTable)
      .where(eq(expedientesTable.id, id))
      .limit(1);
    if (!exp) {
      res.status(404).json({ error: "Expediente no encontrado" });
      return;
    }
    const movs = await db
      .select()
      .from(expedienteMovimientosTable)
      .where(eq(expedienteMovimientosTable.expedienteId, id))
      .orderBy(desc(expedienteMovimientosTable.fecha), asc(expedienteMovimientosTable.id));
    res.json({
      expediente: mapExpediente(exp),
      movimientos: movs.map(mapMovimiento),
    });
  } catch (err) {
    console.error("[GET /admin/expedientes/:id]", err);
    res.status(500).json({ error: "Error", detalle: String(err) });
  }
});

/**
 * Abrir expediente desde una propuesta a la junta resuelta como
 * `expediente_abierto`. Operación atómica:
 *  - Crea el expediente con denominación/descripción/tipología.
 *  - Enlaza la propuesta (db_propuestas_junta.expediente_id).
 *  - Si la propuesta provino de una sugerencia, enlaza también
 *    db_sugerencias.expediente_id.
 *  - Registra el movimiento de tipo 'abrir'.
 *
 * Permitido para roles: directivo, contable.
 */
router.post("/admin/expedientes/abrir", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!hasAnyRole(user, "directivo", "contable")) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }
  const body = req.body ?? {};
  const propuestaId = parseInt(String(body.propuesta_id ?? body.propuestaId ?? ""), 10);
  const denominacion = String(body.denominacion ?? "").trim();
  const descripcion = String(body.descripcion ?? "").trim();
  const tipologiaRaw = String(body.tipologia ?? "sugerencias").trim();
  const observaciones = String(body.observaciones ?? "").trim() || null;
  const actaIdRaw = body.acta_id ?? body.actaId;
  const actaId = actaIdRaw != null && String(actaIdRaw).length > 0 ? parseInt(String(actaIdRaw), 10) : null;
  const fechaRaw = String(body.fecha ?? "").trim();
  const fecha = fechaRaw.length > 0 ? fechaRaw : null;
  const notas = String(body.notas ?? "").trim() || null;

  if (!Number.isFinite(propuestaId)) {
    res.status(400).json({ error: "propuesta_id no válido" });
    return;
  }
  if (denominacion.length < 2) {
    res.status(400).json({ error: "Denominación obligatoria (mín. 2 caracteres)" });
    return;
  }
  if (descripcion.length < 4) {
    res.status(400).json({ error: "Descripción obligatoria (mín. 4 caracteres)" });
    return;
  }
  if (!isTipologia(tipologiaRaw)) {
    res.status(400).json({
      error: "tipologia no válida",
      permitidas: EXPEDIENTE_TIPOLOGIAS,
    });
    return;
  }

  const client = await pool.connect();
  try {
    await ensureExpedientesSchema();
    await client.query("BEGIN");

    // Cargar propuesta y comprobar que está apta para abrir expediente.
    const propRes = await client.query(
      "SELECT * FROM db_propuestas_junta WHERE id = $1 FOR UPDATE",
      [propuestaId],
    );
    if (propRes.rowCount === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Propuesta no encontrada" });
      return;
    }
    const prop = propRes.rows[0] as Record<string, unknown>;
    if (prop.estado_buzon !== "resuelta" || prop.resultado !== "expediente_abierto") {
      await client.query("ROLLBACK");
      res.status(409).json({
        error:
          "La propuesta no está resuelta como 'expediente_abierto'; no se puede abrir expediente.",
        estado_buzon: prop.estado_buzon,
        resultado: prop.resultado,
      });
      return;
    }
    if (prop.expediente_id != null) {
      await client.query("ROLLBACK");
      res.status(409).json({
        error: "La propuesta ya tiene un expediente asociado.",
        expediente_id: prop.expediente_id,
      });
      return;
    }

    const ahora = new Date();
    const insertRes = await client.query(
      `INSERT INTO db_expedientes
         (numero, denominacion, descripcion, tipologia, estado, propuesta_id,
          fecha_apertura, observaciones, creado_por)
       VALUES (
         nextval('db_expedientes_numero_seq')::int,
         $1, $2, $3, 'en_curso', $4, $5, $6, $7)
       RETURNING *`,
      [
        denominacion,
        descripcion,
        tipologiaRaw,
        propuestaId,
        ahora,
        observaciones,
        Number.isFinite(user.uid) ? user.uid : null,
      ],
    );
    const exp = insertRes.rows[0] as Record<string, unknown>;
    const expedienteId = Number(exp.id);

    // Enlazar propuesta → expediente.
    await client.query(
      "UPDATE db_propuestas_junta SET expediente_id = $1, actualizado_en = $2 WHERE id = $3",
      [expedienteId, ahora, propuestaId],
    );
    // Si la propuesta provino de una sugerencia, enlazar también la sugerencia.
    if (prop.origen_tipo === "sugerencia" && prop.origen_id != null) {
      const sugId = Number(prop.origen_id);
      if (Number.isFinite(sugId)) {
        await client.query(
          "UPDATE db_sugerencias SET expediente_id = $1, updated_at = $2 WHERE id = $3",
          [expedienteId, ahora, sugId],
        );
      }
    }

    // Movimiento "abrir".
    await client.query(
      `INSERT INTO db_expediente_movimientos
         (expediente_id, tipo, acta_id, fecha, autor_user_id, notas)
       VALUES ($1, 'abrir', $2, COALESCE($3::date, now()::date), $4, $5)`,
      [expedienteId, Number.isFinite(actaId as number) ? actaId : null, fecha, Number.isFinite(user.uid) ? user.uid : null, notas],
    );

    await client.query("COMMIT");
    res.status(201).json({ ok: true, expediente: exp });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      //
    }
    console.error("[POST /admin/expedientes/abrir]", err);
    res.status(500).json({ error: "Error abriendo expediente", detalle: String(err) });
  } finally {
    client.release();
  }
});

/**
 * Registrar un movimiento `continuar` (seguimiento). Permitido a contable y directivo.
 * Body: { acta_id?, fecha?, notas, observaciones? }
 */
router.post(
  "/admin/expedientes/:id/continuar",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!hasAnyRole(user, "directivo", "contable")) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Id no válido" });
      return;
    }
    const body = req.body ?? {};
    const actaIdRaw = body.acta_id ?? body.actaId;
    const actaId = actaIdRaw != null && String(actaIdRaw).length > 0 ? parseInt(String(actaIdRaw), 10) : null;
    const fechaRaw = String(body.fecha ?? "").trim();
    const fecha = fechaRaw.length > 0 ? fechaRaw : null;
    const notas = String(body.notas ?? "").trim();
    const observaciones = body.observaciones !== undefined
      ? String(body.observaciones ?? "").trim() || null
      : undefined;

    if (notas.length < 2) {
      res.status(400).json({ error: "Las notas del movimiento son obligatorias" });
      return;
    }

    const client = await pool.connect();
    try {
      await ensureExpedientesSchema();
      await client.query("BEGIN");

      const expRes = await client.query(
        "SELECT id, estado FROM db_expedientes WHERE id = $1 FOR UPDATE",
        [id],
      );
      if (expRes.rowCount === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Expediente no encontrado" });
        return;
      }
      if (expRes.rows[0].estado === "cerrado") {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "El expediente ya está cerrado; no admite seguimiento." });
        return;
      }

      const ahora = new Date();
      await client.query(
        `INSERT INTO db_expediente_movimientos
           (expediente_id, tipo, acta_id, fecha, autor_user_id, notas)
         VALUES ($1, 'continuar', $2, COALESCE($3::date, now()::date), $4, $5)`,
        [
          id,
          Number.isFinite(actaId as number) ? actaId : null,
          fecha,
          Number.isFinite(user.uid) ? user.uid : null,
          notas,
        ],
      );

      if (observaciones !== undefined) {
        await client.query(
          "UPDATE db_expedientes SET observaciones = $1, actualizado_en = $2 WHERE id = $3",
          [observaciones, ahora, id],
        );
      } else {
        await client.query(
          "UPDATE db_expedientes SET actualizado_en = $1 WHERE id = $2",
          [ahora, id],
        );
      }

      await client.query("COMMIT");
      res.status(201).json({ ok: true });
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {
        //
      }
      console.error("[POST /admin/expedientes/:id/continuar]", err);
      res.status(500).json({ error: "Error registrando seguimiento", detalle: String(err) });
    } finally {
      client.release();
    }
  },
);

/**
 * Cerrar expediente: estado pasa a 'cerrado'. **Solo contable**.
 * Body: { acta_id?, fecha?, notas (obligatorias), observaciones? }
 */
router.post("/admin/expedientes/:id/cerrar", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!hasAnyRole(user, "contable")) {
    res
      .status(403)
      .json({ error: "El cierre de expedientes está reservado al rol contable." });
    return;
  }
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id no válido" });
    return;
  }
  const body = req.body ?? {};
  const actaIdRaw = body.acta_id ?? body.actaId;
  const actaId = actaIdRaw != null && String(actaIdRaw).length > 0 ? parseInt(String(actaIdRaw), 10) : null;
  const fechaRaw = String(body.fecha ?? "").trim();
  const fecha = fechaRaw.length > 0 ? fechaRaw : null;
  const notas = String(body.notas ?? "").trim();
  const observaciones = body.observaciones !== undefined
    ? String(body.observaciones ?? "").trim() || null
    : undefined;

  if (notas.length < 2) {
    res.status(400).json({ error: "Las notas del cierre son obligatorias" });
    return;
  }

  const client = await pool.connect();
  try {
    await ensureExpedientesSchema();
    await client.query("BEGIN");

    const expRes = await client.query(
      "SELECT id, estado FROM db_expedientes WHERE id = $1 FOR UPDATE",
      [id],
    );
    if (expRes.rowCount === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Expediente no encontrado" });
      return;
    }
    if (expRes.rows[0].estado === "cerrado") {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "El expediente ya está cerrado." });
      return;
    }

    const ahora = new Date();
    await client.query(
      `INSERT INTO db_expediente_movimientos
         (expediente_id, tipo, acta_id, fecha, autor_user_id, notas)
       VALUES ($1, 'cerrar', $2, COALESCE($3::date, now()::date), $4, $5)`,
      [
        id,
        Number.isFinite(actaId as number) ? actaId : null,
        fecha,
        Number.isFinite(user.uid) ? user.uid : null,
        notas,
      ],
    );

    await client.query(
      `UPDATE db_expedientes
          SET estado = 'cerrado',
              fecha_cierre = $1,
              cerrado_por = $2,
              actualizado_en = $1,
              observaciones = CASE WHEN $3::boolean THEN $4 ELSE observaciones END
        WHERE id = $5`,
      [
        ahora,
        Number.isFinite(user.uid) ? user.uid : null,
        observaciones !== undefined,
        observaciones ?? null,
        id,
      ],
    );

    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      //
    }
    console.error("[POST /admin/expedientes/:id/cerrar]", err);
    res.status(500).json({ error: "Error cerrando expediente", detalle: String(err) });
  } finally {
    client.release();
  }
});

/** Documentos adjuntos de un expediente (lectura: directivo/contable). */
router.get(
  "/admin/expedientes/:id/documentos",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!hasAnyRole(user, "directivo", "contable")) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Id no válido" });
      return;
    }
    try {
      await ensureExpedientesSchema();
      await ensureExpedienteDocumentosSchema();
      const exp = await pool.query("SELECT id FROM db_expedientes WHERE id = $1", [id]);
      if (exp.rowCount === 0) {
        res.status(404).json({ error: "Expediente no encontrado" });
        return;
      }
      const rows = await pool.query(
        `SELECT *
           FROM db_expediente_documentos
          WHERE expediente_id = $1
          ORDER BY fecha_documento DESC NULLS LAST, subido_en DESC, id DESC`,
        [id],
      );
      res.json({ items: rows.rows.map(mapDocumento), total: rows.rowCount ?? rows.rows.length });
    } catch (err) {
      console.error("[GET /admin/expedientes/:id/documentos]", err);
      res.status(500).json({ error: "Error consultando documentos", detalle: String(err) });
    }
  },
);

/** Subir PDF adjunto a un expediente (solo contable). */
router.post(
  "/admin/expedientes/:id/documentos",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!hasAnyRole(user, "contable")) {
      res.status(403).json({ error: "Solo el rol contable puede adjuntar documentos." });
      return;
    }
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Id no válido" });
      return;
    }
    const body = req.body ?? {};
    const tipo = String(body.tipo ?? "otros").trim() || "otros";
    const denominacion = String(body.denominacion ?? "").trim() || null;
    const notas = String(body.notas ?? "").trim() || null;
    const originalName = String(body.original_name ?? body.originalName ?? body.filename ?? "").trim();
    const pdfDataUrl = String(body.pdf ?? body.pdf_base64 ?? body.pdfDataUrl ?? "").trim();
    const fechaRaw = String(body.fecha_documento ?? body.fechaDocumento ?? "").trim();
    const importeRaw = body.importe ?? "";
    const importe =
      importeRaw !== null && String(importeRaw).trim().length > 0
        ? String(importeRaw).replace(",", ".").trim()
        : null;

    if (!pdfDataUrl) {
      res.status(400).json({ error: "PDF obligatorio" });
      return;
    }
    if (fechaRaw && !/^\d{4}-\d{2}-\d{2}$/.test(fechaRaw)) {
      res.status(400).json({ error: "fecha_documento debe tener formato YYYY-MM-DD" });
      return;
    }
    if (importe != null && !/^-?\d+(\.\d{1,2})?$/.test(importe)) {
      res.status(400).json({ error: "importe no válido" });
      return;
    }

    try {
      await ensureExpedientesSchema();
      await ensureExpedienteDocumentosSchema();
      const exp = await pool.query(
        "SELECT id, estado FROM db_expedientes WHERE id = $1",
        [id],
      );
      if (exp.rowCount === 0) {
        res.status(404).json({ error: "Expediente no encontrado" });
        return;
      }
      // Si llega `origen` en el body solo se respeta cuando coincide con la
      // regla; en caso contrario decide el estado del expediente.
      const origenBody = String(body.origen ?? "").trim().toLowerCase();
      const origenAuto = origenSegunEstado(exp.rows[0].estado);
      const origen =
        origenBody === "historico" || origenBody === "flujo" ? origenBody : origenAuto;
      const persisted = await persistExpedienteDocumentoPdf({
        expedienteId: id,
        pdfDataUrl,
        originalName: originalName || denominacion || tipo,
      });
      const ins = await pool.query(
        `INSERT INTO db_expediente_documentos
           (expediente_id, tipo, origen, denominacion, url, filename, size,
            fecha_documento, importe, notas, subido_por)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date, $9::numeric, $10, $11)
         RETURNING *`,
        [
          id,
          tipo,
          origen,
          denominacion,
          persisted.url,
          persisted.filename,
          persisted.bytes,
          fechaRaw || null,
          importe,
          notas,
          Number.isFinite(user.uid) ? user.uid : null,
        ],
      );
      await pool.query("UPDATE db_expedientes SET actualizado_en = now() WHERE id = $1", [id]);
      res.status(201).json(mapDocumento(ins.rows[0]));
    } catch (err) {
      console.error("[POST /admin/expedientes/:id/documentos]", err);
      res.status(500).json({ error: "Error subiendo documento", detalle: String(err) });
    }
  },
);

/** Borrar un documento adjunto (solo contable). */
router.delete(
  "/admin/expedientes/:id/documentos/:documentoId",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!hasAnyRole(user, "contable")) {
      res.status(403).json({ error: "Solo el rol contable puede borrar documentos." });
      return;
    }
    const id = parseInt(String(req.params.id), 10);
    const documentoId = parseInt(String(req.params.documentoId), 10);
    if (!Number.isFinite(id) || !Number.isFinite(documentoId)) {
      res.status(400).json({ error: "Id no válido" });
      return;
    }
    try {
      await ensureExpedientesSchema();
      await ensureExpedienteDocumentosSchema();
      // Comprobar el origen del documento y el estado actual del expediente.
      // - Expediente activo (en_curso/preparando): cualquier documento se puede borrar.
      // - Expediente cerrado/archivado: solo se permite borrar documentos
      //   con `origen = 'historico'` (los del flujo original permanecen
      //   inmutables como traza administrativa).
      const docRow = await pool.query(
        `SELECT d.id, d.url, d.origen, e.estado
           FROM db_expediente_documentos d
           JOIN db_expedientes e ON e.id = d.expediente_id
          WHERE d.id = $1 AND d.expediente_id = $2`,
        [documentoId, id],
      );
      if (docRow.rowCount === 0) {
        res.status(404).json({ error: "Documento no encontrado" });
        return;
      }
      const origen = String(docRow.rows[0].origen ?? "flujo");
      const estado = String(docRow.rows[0].estado ?? "");
      if (!ESTADOS_ACTIVOS.has(estado) && origen !== "historico") {
        res.status(409).json({
          error:
            "Este documento pertenece al flujo original de un expediente cerrado y no puede borrarse. Solo se pueden eliminar los documentos marcados como históricos.",
        });
        return;
      }
      const del = await pool.query(
        `DELETE FROM db_expediente_documentos
          WHERE id = $1 AND expediente_id = $2
          RETURNING url`,
        [documentoId, id],
      );
      if (del.rowCount === 0) {
        res.status(404).json({ error: "Documento no encontrado" });
        return;
      }
      await deleteExpedienteDocumentoFile(String(del.rows[0].url ?? ""));
      await pool.query("UPDATE db_expedientes SET actualizado_en = now() WHERE id = $1", [id]);
      res.json({ ok: true });
    } catch (err) {
      console.error("[DELETE /admin/expedientes/:id/documentos/:documentoId]", err);
      res.status(500).json({ error: "Error borrando documento", detalle: String(err) });
    }
  },
);

/**
 * Listado de usuarios seleccionables como responsable de acciones.
 * Devuelve a todos los usuarios; el filtrado fino se hace en cliente.
 */
router.get(
  "/admin/expedientes/usuarios-seleccionables",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!hasAnyRole(user, "directivo", "contable")) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    try {
      const q = String(req.query.q ?? "").trim();
      const params: unknown[] = [];
      let where = "";
      if (q.length > 0) {
        params.push(`%${q.toLowerCase()}%`);
        where = `WHERE LOWER(COALESCE(nombre,'') || ' ' || COALESCE(username,'') || ' ' || COALESCE(email,'')) LIKE $1`;
      }
      const rows = await pool.query(
        `SELECT id, nombre, username, email
           FROM db_users
           ${where}
          ORDER BY nombre NULLS LAST, username NULLS LAST
          LIMIT 200`,
        params,
      );
      res.json({ items: rows.rows, total: rows.rowCount ?? rows.rows.length });
    } catch (err) {
      console.error("[GET /admin/expedientes/usuarios-seleccionables]", err);
      res.status(500).json({ error: "Error", detalle: String(err) });
    }
  },
);

/** Listar acciones de un expediente, con datos del responsable. */
router.get(
  "/admin/expedientes/:id/acciones",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!hasAnyRole(user, "directivo", "contable")) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Id no válido" });
      return;
    }
    try {
      await ensureExpedientesSchema();
      await ensureExpedienteAccionesSchema();
      const rows = await pool.query(
        `SELECT a.*,
                u.nombre AS responsable_nombre,
                u.username AS responsable_username
           FROM db_expediente_acciones a
           LEFT JOIN db_users u ON u.id = a.responsable_user_id
          WHERE a.expediente_id = $1
          ORDER BY
            CASE a.estado WHEN 'pendiente' THEN 0 WHEN 'hecha' THEN 1 ELSE 2 END,
            a.plazo NULLS LAST,
            a.creado_en DESC`,
        [id],
      );
      res.json({ items: rows.rows.map(mapAccion), total: rows.rowCount ?? rows.rows.length });
    } catch (err) {
      console.error("[GET /admin/expedientes/:id/acciones]", err);
      res.status(500).json({ error: "Error", detalle: String(err) });
    }
  },
);

/** Crear una acción suelta para un expediente (sin movimiento asociado). */
router.post(
  "/admin/expedientes/:id/acciones",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!hasAnyRole(user, "directivo", "contable")) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Id no válido" });
      return;
    }
    const parsed = parseAccionInput(req.body);
    if ("error" in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    try {
      await ensureExpedientesSchema();
      await ensureExpedienteAccionesSchema();
      const exp = await pool.query("SELECT id, estado FROM db_expedientes WHERE id = $1", [id]);
      if (exp.rowCount === 0) {
        res.status(404).json({ error: "Expediente no encontrado" });
        return;
      }
      const ins = await pool.query(
        `INSERT INTO db_expediente_acciones
           (expediente_id, descripcion, responsable_user_id, plazo, observaciones, creado_por)
         VALUES ($1, $2, $3, $4::date, $5, $6)
         RETURNING *`,
        [
          id,
          parsed.descripcion,
          parsed.responsable_user_id,
          parsed.plazo,
          parsed.observaciones,
          Number.isFinite(user.uid) ? user.uid : null,
        ],
      );
      res.status(201).json(mapAccion(ins.rows[0]));
    } catch (err) {
      console.error("[POST /admin/expedientes/:id/acciones]", err);
      res.status(500).json({ error: "Error creando acción", detalle: String(err) });
    }
  },
);

/** Editar acción (descripcion / responsable / plazo / observaciones / estado). */
router.put(
  "/admin/expedientes/:id/acciones/:accionId",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!hasAnyRole(user, "directivo", "contable")) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const id = parseInt(String(req.params.id), 10);
    const accionId = parseInt(String(req.params.accionId), 10);
    if (!Number.isFinite(id) || !Number.isFinite(accionId)) {
      res.status(400).json({ error: "Id no válido" });
      return;
    }
    const body = req.body ?? {};
    const sets: string[] = [];
    const params: unknown[] = [];
    const next = (sqlFrag: string, value: unknown) => {
      params.push(value);
      sets.push(`${sqlFrag} = $${params.length}`);
    };

    if (body.descripcion !== undefined) {
      const v = String(body.descripcion ?? "").trim();
      if (v.length < 2) {
        res.status(400).json({ error: "descripcion obligatoria (mín. 2 caracteres)" });
        return;
      }
      next("descripcion", v);
    }
    if (body.responsable_user_id !== undefined || body.responsableUserId !== undefined) {
      const raw = body.responsable_user_id ?? body.responsableUserId;
      const respId =
        raw != null && String(raw).length > 0 ? parseInt(String(raw), 10) : null;
      if (raw != null && String(raw).length > 0 && !Number.isFinite(respId)) {
        res.status(400).json({ error: "responsable_user_id no válido" });
        return;
      }
      next("responsable_user_id", respId);
    }
    if (body.plazo !== undefined) {
      const v = String(body.plazo ?? "").trim();
      params.push(v.length > 0 ? v : null);
      sets.push(`plazo = $${params.length}::date`);
    }
    if (body.observaciones !== undefined) {
      next("observaciones", String(body.observaciones ?? "").trim() || null);
    }
    if (body.estado !== undefined) {
      const v = String(body.estado);
      if (!isAccionEstado(v)) {
        res.status(400).json({
          error: "estado no válido",
          permitidos: EXPEDIENTE_ACCION_ESTADOS,
        });
        return;
      }
      next("estado", v);
      if (v === "hecha") {
        next("completada_en", new Date());
      } else {
        next("completada_en", null);
      }
    }
    if (sets.length === 0) {
      res.status(400).json({ error: "Nada que actualizar" });
      return;
    }
    next("actualizado_en", new Date());

    try {
      await ensureExpedienteAccionesSchema();
      params.push(accionId, id);
      const upd = await pool.query(
        `UPDATE db_expediente_acciones
            SET ${sets.join(", ")}
          WHERE id = $${params.length - 1} AND expediente_id = $${params.length}
          RETURNING *`,
        params,
      );
      if (upd.rowCount === 0) {
        res.status(404).json({ error: "Acción no encontrada" });
        return;
      }
      res.json(mapAccion(upd.rows[0]));
    } catch (err) {
      console.error("[PUT /admin/expedientes/:id/acciones/:accionId]", err);
      res.status(500).json({ error: "Error actualizando acción", detalle: String(err) });
    }
  },
);

/** Eliminar acción (solo si está pendiente o cancelada). */
router.delete(
  "/admin/expedientes/:id/acciones/:accionId",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!hasAnyRole(user, "directivo", "contable")) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const id = parseInt(String(req.params.id), 10);
    const accionId = parseInt(String(req.params.accionId), 10);
    if (!Number.isFinite(id) || !Number.isFinite(accionId)) {
      res.status(400).json({ error: "Id no válido" });
      return;
    }
    try {
      await ensureExpedienteAccionesSchema();
      const del = await pool.query(
        `DELETE FROM db_expediente_acciones
           WHERE id = $1 AND expediente_id = $2 AND estado IN ('pendiente', 'cancelada')
         RETURNING id`,
        [accionId, id],
      );
      if (del.rowCount === 0) {
        res.status(409).json({
          error: "No se puede borrar: la acción no existe o ya está hecha.",
        });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      console.error("[DELETE /admin/expedientes/:id/acciones/:accionId]", err);
      res.status(500).json({ error: "Error borrando acción", detalle: String(err) });
    }
  },
);

/**
 * Apertura de expediente desde un punto de un acta cuyo
 * `expediente_accion = 'abrir'`. Operación atómica:
 *   - Crea el expediente y lo enlaza a la propuesta y a la sugerencia origen.
 *   - Registra un movimiento `abrir` ligado al acta.
 *   - Crea las acciones iniciales (mínimo 1).
 *   - Marca el punto del acta con el expediente_id resultante.
 */
router.post(
  "/admin/actas/:actaId/puntos/:puntoId/abrir-expediente",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!hasAnyRole(user, "contable")) {
      res
        .status(403)
        .json({ error: "Solo el rol contable puede materializar acciones del acta." });
      return;
    }
    const actaId = parseInt(String(req.params.actaId), 10);
    const puntoId = parseInt(String(req.params.puntoId), 10);
    if (!Number.isFinite(actaId) || !Number.isFinite(puntoId)) {
      res.status(400).json({ error: "Id no válido" });
      return;
    }
    const body = req.body ?? {};
    const denominacion = String(body.denominacion ?? "").trim();
    const descripcion = String(body.descripcion ?? "").trim();
    const tipologiaRaw = String(body.tipologia ?? "sugerencias").trim();
    const observaciones = String(body.observaciones ?? "").trim() || null;
    const notas = String(body.notas ?? "").trim() || null;
    if (denominacion.length < 2) {
      res.status(400).json({ error: "Denominación obligatoria (mín. 2 caracteres)" });
      return;
    }
    if (descripcion.length < 4) {
      res.status(400).json({ error: "Descripción obligatoria (mín. 4 caracteres)" });
      return;
    }
    if (!isTipologia(tipologiaRaw)) {
      res.status(400).json({
        error: "tipologia no válida",
        permitidas: EXPEDIENTE_TIPOLOGIAS,
      });
      return;
    }
    const accionesRaw = Array.isArray(body.acciones) ? body.acciones : [];
    if (accionesRaw.length < 1) {
      res.status(400).json({ error: "Debes indicar al menos una acción para abrir el expediente." });
      return;
    }
    const acciones: AccionInput[] = [];
    for (const raw of accionesRaw) {
      const parsed = parseAccionInput(raw);
      if ("error" in parsed) {
        res.status(400).json({ error: parsed.error });
        return;
      }
      acciones.push(parsed);
    }

    const client = await pool.connect();
    try {
      await ensureExpedientesSchema();
      await ensureExpedienteAccionesSchema();
      await client.query("BEGIN");

      const puntoRes = await client.query(
        `SELECT ap.*, a.estado AS acta_estado
           FROM db_acta_puntos ap
           JOIN db_actas a ON a.id = ap.acta_id
          WHERE ap.id = $1 AND ap.acta_id = $2
          FOR UPDATE`,
        [puntoId, actaId],
      );
      if (puntoRes.rowCount === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Punto no encontrado" });
        return;
      }
      const punto = puntoRes.rows[0] as Record<string, unknown>;
      if (punto.acta_estado !== "borrador") {
        await client.query("ROLLBACK");
        res
          .status(409)
          .json({ error: "Solo se puede configurar mientras el acta está en borrador." });
        return;
      }
      if (punto.expediente_accion !== "abrir") {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "Este punto no está marcado para 'abrir' expediente.",
          expediente_accion: punto.expediente_accion,
        });
        return;
      }
      if (punto.expediente_id != null) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "Este punto ya tiene un expediente asociado.",
          expediente_id: punto.expediente_id,
        });
        return;
      }

      const propuestaId = punto.propuesta_id != null ? Number(punto.propuesta_id) : null;
      let propuesta: Record<string, unknown> | null = null;
      if (propuestaId != null && Number.isFinite(propuestaId)) {
        const propRes = await client.query(
          "SELECT * FROM db_propuestas_junta WHERE id = $1 FOR UPDATE",
          [propuestaId],
        );
        if ((propRes.rowCount ?? 0) > 0) propuesta = propRes.rows[0];
      }

      const ahora = new Date();
      const expRes = await client.query(
        `INSERT INTO db_expedientes
           (numero, denominacion, descripcion, tipologia, estado, propuesta_id,
            fecha_apertura, observaciones, creado_por)
         VALUES (
           nextval('db_expedientes_numero_seq')::int,
           $1, $2, $3, 'en_curso', $4, $5, $6, $7)
         RETURNING *`,
        [
          denominacion,
          descripcion,
          tipologiaRaw,
          propuestaId,
          ahora,
          observaciones,
          Number.isFinite(user.uid) ? user.uid : null,
        ],
      );
      const exp = expRes.rows[0] as Record<string, unknown>;
      const expedienteId = Number(exp.id);

      if (propuesta) {
        await client.query(
          "UPDATE db_propuestas_junta SET expediente_id = $1, actualizado_en = $2 WHERE id = $3",
          [expedienteId, ahora, propuestaId],
        );
        if (propuesta.origen_tipo === "sugerencia" && propuesta.origen_id != null) {
          const sugId = Number(propuesta.origen_id);
          if (Number.isFinite(sugId)) {
            await client.query(
              "UPDATE db_sugerencias SET expediente_id = $1, updated_at = $2 WHERE id = $3",
              [expedienteId, ahora, sugId],
            );
          }
        }
      }

      const movRes = await client.query(
        `INSERT INTO db_expediente_movimientos
           (expediente_id, tipo, acta_id, fecha, autor_user_id, notas)
         VALUES ($1, 'abrir', $2, now()::date, $3, $4)
         RETURNING id`,
        [
          expedienteId,
          actaId,
          Number.isFinite(user.uid) ? user.uid : null,
          notas,
        ],
      );
      const movimientoId = Number(movRes.rows[0].id);

      for (const a of acciones) {
        await client.query(
          `INSERT INTO db_expediente_acciones
             (expediente_id, movimiento_id, descripcion, responsable_user_id, plazo, observaciones, creado_por)
           VALUES ($1, $2, $3, $4, $5::date, $6, $7)`,
          [
            expedienteId,
            movimientoId,
            a.descripcion,
            a.responsable_user_id,
            a.plazo,
            a.observaciones,
            Number.isFinite(user.uid) ? user.uid : null,
          ],
        );
      }

      await client.query(
        `UPDATE db_acta_puntos
            SET expediente_id = $1, actualizado_en = $2
          WHERE id = $3`,
        [expedienteId, ahora, puntoId],
      );

      await client.query("COMMIT");
      res.status(201).json({ ok: true, expediente: exp, movimiento_id: movimientoId });
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {
        //
      }
      console.error("[POST /admin/actas/.../abrir-expediente]", err);
      res.status(500).json({ error: "Error abriendo expediente desde acta", detalle: String(err) });
    } finally {
      client.release();
    }
  },
);

/**
 * Continuación de expediente desde un punto de un acta cuyo
 * `expediente_accion = 'continuar'`. Operación atómica:
 *   - Registra un movimiento `continuar` ligado al acta.
 *   - Crea nuevas acciones (`acciones_nuevas`) y actualiza las modificadas
 *     (`acciones_modificadas`, identificadas por id), opcionalmente borra
 *     pendientes (`acciones_borradas: number[]`).
 *   - Marca el punto del acta con el expediente_id (si no estaba ya).
 */
router.post(
  "/admin/actas/:actaId/puntos/:puntoId/continuar-expediente",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!hasAnyRole(user, "contable")) {
      res
        .status(403)
        .json({ error: "Solo el rol contable puede materializar acciones del acta." });
      return;
    }
    const actaId = parseInt(String(req.params.actaId), 10);
    const puntoId = parseInt(String(req.params.puntoId), 10);
    if (!Number.isFinite(actaId) || !Number.isFinite(puntoId)) {
      res.status(400).json({ error: "Id no válido" });
      return;
    }
    const body = req.body ?? {};
    const expedienteIdRaw = body.expediente_id ?? body.expedienteId;
    const expedienteId = expedienteIdRaw != null ? parseInt(String(expedienteIdRaw), 10) : NaN;
    if (!Number.isFinite(expedienteId)) {
      res.status(400).json({ error: "expediente_id no válido" });
      return;
    }
    const notas = String(body.notas ?? "").trim() || null;
    const observacionesGen = body.observaciones !== undefined
      ? String(body.observaciones ?? "").trim() || null
      : undefined;

    const accionesNuevasRaw = Array.isArray(body.acciones_nuevas) ? body.acciones_nuevas : [];
    const accionesNuevas: AccionInput[] = [];
    for (const raw of accionesNuevasRaw) {
      const parsed = parseAccionInput(raw);
      if ("error" in parsed) {
        res.status(400).json({ error: parsed.error });
        return;
      }
      accionesNuevas.push(parsed);
    }
    const accionesModificadasRaw = Array.isArray(body.acciones_modificadas)
      ? (body.acciones_modificadas as Record<string, unknown>[])
      : [];
    const accionesBorradas = Array.isArray(body.acciones_borradas)
      ? body.acciones_borradas
          .map((x: unknown) => parseInt(String(x), 10))
          .filter((x: number) => Number.isFinite(x))
      : [];

    const client = await pool.connect();
    try {
      await ensureExpedientesSchema();
      await ensureExpedienteAccionesSchema();
      await client.query("BEGIN");

      const puntoRes = await client.query(
        `SELECT ap.*, a.estado AS acta_estado
           FROM db_acta_puntos ap
           JOIN db_actas a ON a.id = ap.acta_id
          WHERE ap.id = $1 AND ap.acta_id = $2
          FOR UPDATE`,
        [puntoId, actaId],
      );
      if (puntoRes.rowCount === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Punto no encontrado" });
        return;
      }
      const punto = puntoRes.rows[0] as Record<string, unknown>;
      if (punto.acta_estado !== "borrador") {
        await client.query("ROLLBACK");
        res
          .status(409)
          .json({ error: "Solo se puede configurar mientras el acta está en borrador." });
        return;
      }
      if (punto.expediente_accion !== "continuar") {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "Este punto no está marcado para 'continuar' expediente.",
          expediente_accion: punto.expediente_accion,
        });
        return;
      }

      const expRes = await client.query(
        "SELECT id, estado FROM db_expedientes WHERE id = $1 FOR UPDATE",
        [expedienteId],
      );
      if (expRes.rowCount === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Expediente no encontrado" });
        return;
      }
      if (expRes.rows[0].estado === "cerrado") {
        await client.query("ROLLBACK");
        res
          .status(409)
          .json({ error: "El expediente está cerrado y no admite seguimiento." });
        return;
      }

      const ahora = new Date();
      const movRes = await client.query(
        `INSERT INTO db_expediente_movimientos
           (expediente_id, tipo, acta_id, fecha, autor_user_id, notas)
         VALUES ($1, 'continuar', $2, now()::date, $3, $4)
         RETURNING id`,
        [
          expedienteId,
          actaId,
          Number.isFinite(user.uid) ? user.uid : null,
          notas,
        ],
      );
      const movimientoId = Number(movRes.rows[0].id);

      // Editar existentes.
      for (const m of accionesModificadasRaw) {
        const accionId = parseInt(String(m.id ?? m.accion_id ?? ""), 10);
        if (!Number.isFinite(accionId)) continue;
        const sets: string[] = [];
        const params: unknown[] = [];
        if (m.descripcion !== undefined) {
          const v = String(m.descripcion ?? "").trim();
          if (v.length < 2) {
            await client.query("ROLLBACK");
            res.status(400).json({ error: "descripcion obligatoria (mín. 2 caracteres)" });
            return;
          }
          params.push(v);
          sets.push(`descripcion = $${params.length}`);
        }
        if (m.responsable_user_id !== undefined || m.responsableUserId !== undefined) {
          const raw = m.responsable_user_id ?? m.responsableUserId;
          const respId =
            raw != null && String(raw).length > 0 ? parseInt(String(raw), 10) : null;
          params.push(respId);
          sets.push(`responsable_user_id = $${params.length}`);
        }
        if (m.plazo !== undefined) {
          const v = String(m.plazo ?? "").trim();
          params.push(v.length > 0 ? v : null);
          sets.push(`plazo = $${params.length}::date`);
        }
        if (m.observaciones !== undefined) {
          params.push(String(m.observaciones ?? "").trim() || null);
          sets.push(`observaciones = $${params.length}`);
        }
        if (m.estado !== undefined) {
          const v = String(m.estado);
          if (!isAccionEstado(v)) {
            await client.query("ROLLBACK");
            res.status(400).json({
              error: "estado no válido",
              permitidos: EXPEDIENTE_ACCION_ESTADOS,
            });
            return;
          }
          params.push(v);
          sets.push(`estado = $${params.length}`);
          if (v === "hecha") {
            params.push(ahora);
            sets.push(`completada_en = $${params.length}`);
          } else {
            params.push(null);
            sets.push(`completada_en = $${params.length}`);
          }
        }
        if (sets.length === 0) continue;
        params.push(ahora);
        sets.push(`actualizado_en = $${params.length}`);
        params.push(accionId, expedienteId);
        await client.query(
          `UPDATE db_expediente_acciones
              SET ${sets.join(", ")}
            WHERE id = $${params.length - 1} AND expediente_id = $${params.length}`,
          params,
        );
      }

      // Borrar (solo pendientes o canceladas).
      for (const aid of accionesBorradas as number[]) {
        await client.query(
          `DELETE FROM db_expediente_acciones
             WHERE id = $1 AND expediente_id = $2 AND estado IN ('pendiente', 'cancelada')`,
          [aid, expedienteId],
        );
      }

      // Crear nuevas.
      for (const a of accionesNuevas) {
        await client.query(
          `INSERT INTO db_expediente_acciones
             (expediente_id, movimiento_id, descripcion, responsable_user_id, plazo, observaciones, creado_por)
           VALUES ($1, $2, $3, $4, $5::date, $6, $7)`,
          [
            expedienteId,
            movimientoId,
            a.descripcion,
            a.responsable_user_id,
            a.plazo,
            a.observaciones,
            Number.isFinite(user.uid) ? user.uid : null,
          ],
        );
      }

      if (observacionesGen !== undefined) {
        await client.query(
          "UPDATE db_expedientes SET observaciones = $1, actualizado_en = $2 WHERE id = $3",
          [observacionesGen, ahora, expedienteId],
        );
      } else {
        await client.query(
          "UPDATE db_expedientes SET actualizado_en = $1 WHERE id = $2",
          [ahora, expedienteId],
        );
      }

      await client.query(
        `UPDATE db_acta_puntos
            SET expediente_id = $1, actualizado_en = $2
          WHERE id = $3`,
        [expedienteId, ahora, puntoId],
      );

      await client.query("COMMIT");
      res.status(201).json({ ok: true, movimiento_id: movimientoId });
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {
        //
      }
      console.error("[POST /admin/actas/.../continuar-expediente]", err);
      res
        .status(500)
        .json({ error: "Error registrando continuación", detalle: String(err) });
    } finally {
      client.release();
    }
  },
);

// Helpers Drizzle reservados para uso futuro.
void sql;
void sugerenciasTable;

export default router;
