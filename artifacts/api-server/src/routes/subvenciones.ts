import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { persistExpedienteDocumentoPdf } from "../lib/expedienteDocumentos";

const router: IRouter = Router();

const SUBESTADOS = [
  "preparando",
  "aprobada_junta",
  "solicitud_enviada",
  "resuelta_concedida",
  "resuelta_denegada",
  "en_ejecucion",
  "justif_intermedia_enviada",
  "contestada_intermedia",
  "justif_final_enviada",
  "contestada_final",
  "propuesta_cierre",
] as const;

type Subestado = (typeof SUBESTADOS)[number];
type PropuestaTipo = "inicial" | "cierre";

function rolesOf(user: { role?: string; roles?: string[] }): string[] {
  if (Array.isArray(user.roles) && user.roles.length > 0) return user.roles;
  if (user.role) return [user.role];
  return [];
}

function hasAnyRole(user: { role?: string; roles?: string[] }, ...allowed: string[]): boolean {
  const rs = rolesOf(user);
  return allowed.some((r) => rs.includes(r));
}

function isSubestado(value: string): value is Subestado {
  return (SUBESTADOS as readonly string[]).includes(value);
}

function userId(user: { uid?: number }): number | null {
  return Number.isFinite(user.uid) ? Number(user.uid) : null;
}

function textOrNull(value: unknown): string | null {
  const v = String(value ?? "").trim();
  return v.length > 0 ? v : null;
}

function dateOrNull(value: unknown): string | null {
  const v = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

function moneyOrNull(value: unknown): string | null {
  const v = String(value ?? "").replace(",", ".").trim();
  if (!v) return null;
  if (!/^-?\d+(\.\d{1,2})?$/.test(v)) return null;
  return v;
}

async function ensureSubvencionesSchema(): Promise<void> {
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
      CREATE TABLE IF NOT EXISTS db_expediente_subvencion (
        expediente_id              INTEGER PRIMARY KEY,
        organismo                  VARCHAR(255),
        convocatoria_codigo        VARCHAR(255),
        plazo_solicitud            DATE,
        plazo_justif_intermedia    DATE,
        plazo_justif_final         DATE,
        importe_disponible         NUMERIC(14,2),
        importe_solicitado         NUMERIC(14,2),
        importe_concedido          NUMERIC(14,2),
        importe_justif_intermedio  NUMERIC(14,2),
        importe_cobrado_intermedio NUMERIC(14,2),
        importe_justif_final       NUMERIC(14,2),
        importe_cobrado_final      NUMERIC(14,2),
        subestado                  VARCHAR(40) NOT NULL DEFAULT 'preparando',
        propuesta_inicial_id       INTEGER,
        propuesta_cierre_id        INTEGER,
        creado_en                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        actualizado_en             TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS db_expediente_subvencion_subestado_idx
        ON db_expediente_subvencion (subestado, actualizado_en DESC)
    `);
  } catch (e) {
    console.warn("[ensureSubvencionesSchema]", e);
  }
}

function mapSubvencion(row: Record<string, unknown>) {
  return {
    expediente: {
      id: row.id,
      numero: row.numero,
      denominacion: row.denominacion,
      descripcion: row.descripcion,
      tipologia: row.tipologia,
      estado: row.estado,
      propuesta_id: row.propuesta_id,
      fecha_apertura: row.fecha_apertura,
      fecha_cierre: row.fecha_cierre,
      observaciones: row.observaciones,
      creado_en: row.creado_en,
      actualizado_en: row.actualizado_en,
      creado_por: row.creado_por,
      cerrado_por: row.cerrado_por,
    },
    subvencion: {
      expediente_id: row.expediente_id,
      organismo: row.organismo,
      convocatoria_codigo: row.convocatoria_codigo,
      plazo_solicitud: row.plazo_solicitud,
      plazo_justif_intermedia: row.plazo_justif_intermedia,
      plazo_justif_final: row.plazo_justif_final,
      importe_disponible: row.importe_disponible,
      importe_solicitado: row.importe_solicitado,
      importe_concedido: row.importe_concedido,
      importe_justif_intermedio: row.importe_justif_intermedio,
      importe_cobrado_intermedio: row.importe_cobrado_intermedio,
      importe_justif_final: row.importe_justif_final,
      importe_cobrado_final: row.importe_cobrado_final,
      subestado: row.subestado,
      propuesta_inicial_id: row.propuesta_inicial_id,
      propuesta_cierre_id: row.propuesta_cierre_id,
      creado_en: row.subv_creado_en,
      actualizado_en: row.subv_actualizado_en,
    },
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
  };
}

async function loadSubvencion(expedienteId: number) {
  const res = await pool.query(
    `SELECT e.*,
            s.expediente_id, s.organismo, s.convocatoria_codigo,
            s.plazo_solicitud, s.plazo_justif_intermedia, s.plazo_justif_final,
            s.importe_disponible, s.importe_solicitado, s.importe_concedido,
            s.importe_justif_intermedio, s.importe_cobrado_intermedio,
            s.importe_justif_final, s.importe_cobrado_final,
            s.subestado, s.propuesta_inicial_id, s.propuesta_cierre_id,
            s.creado_en AS subv_creado_en,
            s.actualizado_en AS subv_actualizado_en
       FROM db_expedientes e
       JOIN db_expediente_subvencion s ON s.expediente_id = e.id
      WHERE e.id = $1 AND e.tipologia = 'subvenciones'`,
    [expedienteId],
  );
  return res.rows[0] as Record<string, unknown> | undefined;
}

function buildPropuestaText(args: {
  tipo: PropuestaTipo;
  denominacion: string;
  descripcion: string;
  organismo: string | null;
  importeSolicitado: string | null;
  importeConcedido: string | null;
}): { denominacion: string; descripcion: string; decision: string; antecedentes: string } {
  if (args.tipo === "cierre") {
    return {
      denominacion: `Cierre de subvencion: ${args.denominacion}`,
      descripcion: [
        "**Objetivo**",
        "Cerrar el expediente de subvencion tras completar su justificacion.",
        "",
        "**Necesidad que cubre**",
        "Dejar constancia formal del cierre administrativo y economico.",
        "",
        "**Pasos a dar**",
        "Aprobar el cierre del expediente y archivar la documentacion asociada.",
        "",
        "**Beneficios esperados**",
        "Trazabilidad completa del ciclo de la subvencion.",
      ].join("\n"),
      decision: "cerrar_expediente",
      antecedentes: args.descripcion,
    };
  }
  return {
    denominacion: `Solicitud de subvencion: ${args.denominacion}`,
    descripcion: [
      "**Objetivo**",
      args.descripcion,
      "",
      "**Necesidad que cubre**",
      args.organismo ? `Atender la convocatoria publicada por ${args.organismo}.` : "",
      "",
      "**Pasos a dar**",
      "Presentar la solicitud, realizar el seguimiento y justificar los importes concedidos.",
      "",
      "**Beneficios esperados**",
      args.importeSolicitado
        ? `Obtener una financiacion solicitada de ${args.importeSolicitado}.`
        : "Obtener financiacion para el proyecto presentado.",
    ].join("\n"),
    decision: "abrir_expediente",
    antecedentes: args.descripcion,
  };
}

/** Listado: vista=en_curso (default) o vista=historial. Solo contable. */
router.get("/admin/subvenciones", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!hasAnyRole(user, "contable")) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }
  const vista = String(req.query.vista ?? "en_curso");
  const estado = String(req.query.estado ?? "").trim();
  try {
    await ensureSubvencionesSchema();
    const params: unknown[] = [];
    const filters = ["e.tipologia = 'subvenciones'"];
    if (estado) {
      params.push(estado);
      filters.push(`e.estado = $${params.length}`);
    } else if (vista === "historial") {
      filters.push("e.estado IN ('cerrado', 'archivado')");
    } else {
      filters.push("e.estado IN ('preparando', 'en_curso')");
    }
    const rows = await pool.query(
      `SELECT e.*,
              s.expediente_id, s.organismo, s.convocatoria_codigo,
              s.plazo_solicitud, s.plazo_justif_intermedia, s.plazo_justif_final,
              s.importe_disponible, s.importe_solicitado, s.importe_concedido,
              s.importe_justif_intermedio, s.importe_cobrado_intermedio,
              s.importe_justif_final, s.importe_cobrado_final,
              s.subestado, s.propuesta_inicial_id, s.propuesta_cierre_id,
              s.creado_en AS subv_creado_en,
              s.actualizado_en AS subv_actualizado_en
         FROM db_expedientes e
         JOIN db_expediente_subvencion s ON s.expediente_id = e.id
        WHERE ${filters.join(" AND ")}
        ORDER BY e.actualizado_en DESC, e.creado_en DESC`,
      params,
    );
    res.json({ items: rows.rows.map(mapSubvencion), total: rows.rowCount ?? rows.rows.length });
  } catch (err) {
    console.error("[GET /admin/subvenciones]", err);
    res.status(500).json({ error: "Error consultando subvenciones", detalle: String(err) });
  }
});

/** Alta desde decreto PDF: crea expediente en estado preparando. */
router.post("/admin/subvenciones", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!hasAnyRole(user, "contable")) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }
  const body = req.body ?? {};
  const denominacion = String(body.denominacion ?? "").trim();
  const descripcion = String(body.descripcion ?? "").trim();
  if (denominacion.length < 2) {
    res.status(400).json({ error: "Denominación obligatoria" });
    return;
  }
  if (descripcion.length < 4) {
    res.status(400).json({ error: "Descripción obligatoria" });
    return;
  }

  const client = await pool.connect();
  try {
    await ensureSubvencionesSchema();
    await client.query("BEGIN");
    const now = new Date();
    const expRes = await client.query(
      `INSERT INTO db_expedientes
         (numero, denominacion, descripcion, tipologia, estado,
          fecha_apertura, observaciones, creado_por)
       VALUES (
         nextval('db_expedientes_numero_seq')::int,
         $1, $2, 'subvenciones', 'preparando', $3, $4, $5)
       RETURNING *`,
      [
        denominacion,
        descripcion,
        now,
        textOrNull(body.observaciones),
        userId(user),
      ],
    );
    const expedienteId = Number(expRes.rows[0].id);
    await client.query(
      `INSERT INTO db_expediente_subvencion
         (expediente_id, organismo, convocatoria_codigo,
          plazo_solicitud, plazo_justif_intermedia, plazo_justif_final,
          importe_disponible, importe_solicitado)
       VALUES ($1, $2, $3, $4::date, $5::date, $6::date, $7::numeric, $8::numeric)`,
      [
        expedienteId,
        textOrNull(body.organismo),
        textOrNull(body.convocatoria_codigo ?? body.convocatoriaCodigo),
        dateOrNull(body.plazo_solicitud ?? body.plazoSolicitud),
        dateOrNull(body.plazo_justif_intermedia ?? body.plazoJustifIntermedia),
        dateOrNull(body.plazo_justif_final ?? body.plazoJustifFinal),
        moneyOrNull(body.importe_disponible ?? body.importeDisponible),
        moneyOrNull(body.importe_solicitado ?? body.importeSolicitado),
      ],
    );

    const decretoPdf = String(body.decreto_pdf ?? body.decretoPdf ?? body.pdf ?? "").trim();
    if (decretoPdf) {
      const persisted = await persistExpedienteDocumentoPdf({
        expedienteId,
        pdfDataUrl: decretoPdf,
        originalName: textOrNull(body.decreto_filename ?? body.decretoFilename) ?? "decreto",
      });
      await client.query(
        `INSERT INTO db_expediente_documentos
           (expediente_id, tipo, denominacion, url, filename, size,
            fecha_documento, notas, subido_por)
         VALUES ($1, 'decreto', $2, $3, $4, $5, $6::date, $7, $8)`,
        [
          expedienteId,
          textOrNull(body.decreto_denominacion ?? body.decretoDenominacion) ?? "Decreto",
          persisted.url,
          persisted.filename,
          persisted.bytes,
          dateOrNull(body.fecha_decreto ?? body.fechaDecreto),
          textOrNull(body.decreto_notas ?? body.decretoNotas),
          userId(user),
        ],
      );
    }

    await client.query("COMMIT");
    const row = await loadSubvencion(expedienteId);
    res.status(201).json({ ok: true, ...(row ? mapSubvencion(row) : {}) });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      //
    }
    console.error("[POST /admin/subvenciones]", err);
    res.status(500).json({ error: "Error creando subvención", detalle: String(err) });
  } finally {
    client.release();
  }
});

/** Ficha completa de una subvención. */
router.get("/admin/subvenciones/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!hasAnyRole(user, "contable")) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id no válido" });
    return;
  }
  try {
    await ensureSubvencionesSchema();
    const row = await loadSubvencion(id);
    if (!row) {
      res.status(404).json({ error: "Subvención no encontrada" });
      return;
    }
    const [documentos, movimientos, acciones, propuestas] = await Promise.all([
      pool.query(
        `SELECT * FROM db_expediente_documentos
          WHERE expediente_id = $1
          ORDER BY fecha_documento DESC NULLS LAST, subido_en DESC`,
        [id],
      ),
      pool.query(
        `SELECT * FROM db_expediente_movimientos
          WHERE expediente_id = $1
          ORDER BY fecha DESC, id DESC`,
        [id],
      ),
      pool.query(
        `SELECT a.*, u.nombre AS responsable_nombre, u.username AS responsable_username
           FROM db_expediente_acciones a
           LEFT JOIN db_users u ON u.id = a.responsable_user_id
          WHERE a.expediente_id = $1
          ORDER BY a.plazo NULLS LAST, a.creado_en DESC`,
        [id],
      ),
      pool.query(
        `SELECT * FROM db_propuestas_junta
          WHERE origen_tipo = 'subvencion' AND origen_id = $1
          ORDER BY creado_en DESC`,
        [id],
      ),
    ]);
    res.json({
      ...mapSubvencion(row),
      documentos: documentos.rows.map(mapDocumento),
      movimientos: movimientos.rows,
      acciones: acciones.rows,
      propuestas: propuestas.rows,
    });
  } catch (err) {
    console.error("[GET /admin/subvenciones/:id]", err);
    res.status(500).json({ error: "Error consultando subvención", detalle: String(err) });
  }
});

/** Actualizar datos administrativos, plazos e importes. */
router.put("/admin/subvenciones/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!hasAnyRole(user, "contable")) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id no válido" });
    return;
  }
  const body = req.body ?? {};
  const now = new Date();
  const client = await pool.connect();
  try {
    await ensureSubvencionesSchema();
    await client.query("BEGIN");
    const existing = await client.query(
      "SELECT e.id FROM db_expedientes e JOIN db_expediente_subvencion s ON s.expediente_id = e.id WHERE e.id = $1 FOR UPDATE",
      [id],
    );
    if (existing.rowCount === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Subvención no encontrada" });
      return;
    }
    await client.query(
      `UPDATE db_expedientes
          SET denominacion = COALESCE($1, denominacion),
              descripcion = COALESCE($2, descripcion),
              observaciones = CASE WHEN $3::boolean THEN $4 ELSE observaciones END,
              actualizado_en = $5
        WHERE id = $6`,
      [
        textOrNull(body.denominacion),
        textOrNull(body.descripcion),
        body.observaciones !== undefined,
        textOrNull(body.observaciones),
        now,
        id,
      ],
    );
    await client.query(
      `UPDATE db_expediente_subvencion
          SET organismo = CASE WHEN $1::boolean THEN $2 ELSE organismo END,
              convocatoria_codigo = CASE WHEN $3::boolean THEN $4 ELSE convocatoria_codigo END,
              plazo_solicitud = CASE WHEN $5::boolean THEN $6::date ELSE plazo_solicitud END,
              plazo_justif_intermedia = CASE WHEN $7::boolean THEN $8::date ELSE plazo_justif_intermedia END,
              plazo_justif_final = CASE WHEN $9::boolean THEN $10::date ELSE plazo_justif_final END,
              importe_disponible = CASE WHEN $11::boolean THEN $12::numeric ELSE importe_disponible END,
              importe_solicitado = CASE WHEN $13::boolean THEN $14::numeric ELSE importe_solicitado END,
              importe_concedido = CASE WHEN $15::boolean THEN $16::numeric ELSE importe_concedido END,
              importe_justif_intermedio = CASE WHEN $17::boolean THEN $18::numeric ELSE importe_justif_intermedio END,
              importe_cobrado_intermedio = CASE WHEN $19::boolean THEN $20::numeric ELSE importe_cobrado_intermedio END,
              importe_justif_final = CASE WHEN $21::boolean THEN $22::numeric ELSE importe_justif_final END,
              importe_cobrado_final = CASE WHEN $23::boolean THEN $24::numeric ELSE importe_cobrado_final END,
              actualizado_en = $25
        WHERE expediente_id = $26`,
      [
        body.organismo !== undefined,
        textOrNull(body.organismo),
        body.convocatoria_codigo !== undefined || body.convocatoriaCodigo !== undefined,
        textOrNull(body.convocatoria_codigo ?? body.convocatoriaCodigo),
        body.plazo_solicitud !== undefined || body.plazoSolicitud !== undefined,
        dateOrNull(body.plazo_solicitud ?? body.plazoSolicitud),
        body.plazo_justif_intermedia !== undefined || body.plazoJustifIntermedia !== undefined,
        dateOrNull(body.plazo_justif_intermedia ?? body.plazoJustifIntermedia),
        body.plazo_justif_final !== undefined || body.plazoJustifFinal !== undefined,
        dateOrNull(body.plazo_justif_final ?? body.plazoJustifFinal),
        body.importe_disponible !== undefined || body.importeDisponible !== undefined,
        moneyOrNull(body.importe_disponible ?? body.importeDisponible),
        body.importe_solicitado !== undefined || body.importeSolicitado !== undefined,
        moneyOrNull(body.importe_solicitado ?? body.importeSolicitado),
        body.importe_concedido !== undefined || body.importeConcedido !== undefined,
        moneyOrNull(body.importe_concedido ?? body.importeConcedido),
        body.importe_justif_intermedio !== undefined || body.importeJustifIntermedio !== undefined,
        moneyOrNull(body.importe_justif_intermedio ?? body.importeJustifIntermedio),
        body.importe_cobrado_intermedio !== undefined || body.importeCobradoIntermedio !== undefined,
        moneyOrNull(body.importe_cobrado_intermedio ?? body.importeCobradoIntermedio),
        body.importe_justif_final !== undefined || body.importeJustifFinal !== undefined,
        moneyOrNull(body.importe_justif_final ?? body.importeJustifFinal),
        body.importe_cobrado_final !== undefined || body.importeCobradoFinal !== undefined,
        moneyOrNull(body.importe_cobrado_final ?? body.importeCobradoFinal),
        now,
        id,
      ],
    );
    await client.query("COMMIT");
    const row = await loadSubvencion(id);
    res.json({ ok: true, ...(row ? mapSubvencion(row) : {}) });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      //
    }
    console.error("[PUT /admin/subvenciones/:id]", err);
    res.status(500).json({ error: "Error actualizando subvención", detalle: String(err) });
  } finally {
    client.release();
  }
});

/** Crear propuesta a la junta inicial o de cierre. */
router.post("/admin/subvenciones/:id/presentar-junta", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!hasAnyRole(user, "contable")) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id no válido" });
    return;
  }
  const tipo: PropuestaTipo = String(req.body?.tipo ?? "inicial") === "cierre" ? "cierre" : "inicial";
  const client = await pool.connect();
  try {
    await ensureSubvencionesSchema();
    await client.query("BEGIN");
    const rowRes = await client.query(
      `SELECT e.*, s.*
         FROM db_expedientes e
         JOIN db_expediente_subvencion s ON s.expediente_id = e.id
        WHERE e.id = $1 AND e.tipologia = 'subvenciones'
        FOR UPDATE`,
      [id],
    );
    if (rowRes.rowCount === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Subvención no encontrada" });
      return;
    }
    const row = rowRes.rows[0] as Record<string, unknown>;
    const existingId =
      tipo === "cierre" ? Number(row.propuesta_cierre_id) : Number(row.propuesta_inicial_id);
    if (Number.isFinite(existingId)) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "La propuesta ya existe.", propuesta_id: existingId });
      return;
    }
    const propuesta = buildPropuestaText({
      tipo,
      denominacion: String(row.denominacion ?? ""),
      descripcion: String(row.descripcion ?? ""),
      organismo: textOrNull(row.organismo),
      importeSolicitado: textOrNull(row.importe_solicitado),
      importeConcedido: textOrNull(row.importe_concedido),
    });
    const ins = await client.query(
      `INSERT INTO db_propuestas_junta
         (creado_por, origen_tipo, origen_id, denominacion, descripcion,
          decision_solicitada, estado_buzon, antecedentes)
       VALUES ($1, 'subvencion', $2, $3, $4, $5, 'pendiente', $6)
       RETURNING *`,
      [
        userId(user),
        id,
        propuesta.denominacion,
        propuesta.descripcion,
        propuesta.decision,
        propuesta.antecedentes,
      ],
    );
    const propuestaId = Number(ins.rows[0].id);
    await client.query(
      `UPDATE db_expediente_subvencion
          SET ${tipo === "cierre" ? "propuesta_cierre_id" : "propuesta_inicial_id"} = $1,
              subestado = CASE WHEN $2::text = 'cierre' THEN 'propuesta_cierre' ELSE subestado END,
              actualizado_en = now()
        WHERE expediente_id = $3`,
      [propuestaId, tipo, id],
    );
    await client.query("UPDATE db_expedientes SET actualizado_en = now() WHERE id = $1", [id]);
    await client.query("COMMIT");
    res.status(201).json({ ok: true, propuesta: ins.rows[0] });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      //
    }
    console.error("[POST /admin/subvenciones/:id/presentar-junta]", err);
    res.status(500).json({ error: "Error creando propuesta", detalle: String(err) });
  } finally {
    client.release();
  }
});

/**
 * Alta retroactiva (subvención histórica).
 *
 * Crea un expediente de tipologia='subvenciones' directamente en estado
 * `cerrado` o `archivado`, sin pasar por junta ni acta. Permite adjuntar
 * en la misma llamada N documentos PDF (decreto, solicitud, resoluciones,
 * justificaciones, contestaciones, etc.). Todos los documentos quedan
 * marcados con `origen='historico'`.
 *
 * Body esperado:
 *   - denominacion (req), descripcion (req)
 *   - organismo, convocatoria_codigo
 *   - plazos: plazo_solicitud, plazo_justif_intermedia, plazo_justif_final
 *   - importes: importe_disponible, importe_solicitado, importe_concedido,
 *               importe_justif_intermedio, importe_cobrado_intermedio,
 *               importe_justif_final, importe_cobrado_final
 *   - estado_final: 'cerrado' (def) | 'archivado'
 *   - subestado_final: subestado terminal (def. 'resuelta_concedida' si está cerrado;
 *                                          'resuelta_denegada' si archivado)
 *   - fecha_cierre: opcional (ISO date)
 *   - observaciones
 *   - documentos: [{ tipo, denominacion, fecha_documento, importe, notas,
 *                    pdf (data url), original_name }]
 */
router.post("/admin/subvenciones/historico", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!hasAnyRole(user, "contable")) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }
  const body = req.body ?? {};
  const denominacion = String(body.denominacion ?? "").trim();
  const descripcion = String(body.descripcion ?? "").trim();
  if (denominacion.length < 2) {
    res.status(400).json({ error: "Denominación obligatoria" });
    return;
  }
  if (descripcion.length < 4) {
    res.status(400).json({ error: "Descripción obligatoria" });
    return;
  }

  const estadoFinalRaw = String(body.estado_final ?? body.estadoFinal ?? "cerrado").trim();
  const estadoFinal =
    estadoFinalRaw === "archivado" ? "archivado" : "cerrado";
  const subestadoDefault = estadoFinal === "archivado" ? "resuelta_denegada" : "resuelta_concedida";
  const subestadoRaw = String(body.subestado_final ?? body.subestadoFinal ?? subestadoDefault).trim();
  const subestadoFinal = isSubestado(subestadoRaw) ? subestadoRaw : subestadoDefault;

  const documentos = Array.isArray(body.documentos) ? body.documentos : [];

  const client = await pool.connect();
  try {
    await ensureSubvencionesSchema();
    await client.query("BEGIN");
    const now = new Date();
    const fechaCierre = dateOrNull(body.fecha_cierre ?? body.fechaCierre);
    const expRes = await client.query(
      `INSERT INTO db_expedientes
         (numero, denominacion, descripcion, tipologia, estado,
          fecha_apertura, fecha_cierre, observaciones, creado_por, cerrado_por)
       VALUES (
         nextval('db_expedientes_numero_seq')::int,
         $1, $2, 'subvenciones', $3, $4, $5::timestamptz, $6, $7, $8)
       RETURNING *`,
      [
        denominacion,
        descripcion,
        estadoFinal,
        now,
        fechaCierre,
        textOrNull(body.observaciones),
        userId(user),
        estadoFinal === "cerrado" ? userId(user) : null,
      ],
    );
    const expedienteId = Number(expRes.rows[0].id);
    await client.query(
      `INSERT INTO db_expediente_subvencion
         (expediente_id, organismo, convocatoria_codigo,
          plazo_solicitud, plazo_justif_intermedia, plazo_justif_final,
          importe_disponible, importe_solicitado, importe_concedido,
          importe_justif_intermedio, importe_cobrado_intermedio,
          importe_justif_final, importe_cobrado_final,
          subestado)
       VALUES ($1, $2, $3,
               $4::date, $5::date, $6::date,
               $7::numeric, $8::numeric, $9::numeric,
               $10::numeric, $11::numeric,
               $12::numeric, $13::numeric,
               $14)`,
      [
        expedienteId,
        textOrNull(body.organismo),
        textOrNull(body.convocatoria_codigo ?? body.convocatoriaCodigo),
        dateOrNull(body.plazo_solicitud ?? body.plazoSolicitud),
        dateOrNull(body.plazo_justif_intermedia ?? body.plazoJustifIntermedia),
        dateOrNull(body.plazo_justif_final ?? body.plazoJustifFinal),
        moneyOrNull(body.importe_disponible ?? body.importeDisponible),
        moneyOrNull(body.importe_solicitado ?? body.importeSolicitado),
        moneyOrNull(body.importe_concedido ?? body.importeConcedido),
        moneyOrNull(body.importe_justif_intermedio ?? body.importeJustifIntermedio),
        moneyOrNull(body.importe_cobrado_intermedio ?? body.importeCobradoIntermedio),
        moneyOrNull(body.importe_justif_final ?? body.importeJustifFinal),
        moneyOrNull(body.importe_cobrado_final ?? body.importeCobradoFinal),
        subestadoFinal,
      ],
    );

    let documentosCreados = 0;
    for (const docRaw of documentos) {
      if (!docRaw || typeof docRaw !== "object") continue;
      const doc = docRaw as Record<string, unknown>;
      const pdf = String(doc.pdf ?? doc.pdf_base64 ?? doc.pdfDataUrl ?? "").trim();
      if (!pdf) continue;
      const tipo = String(doc.tipo ?? "otros").trim() || "otros";
      const denomDoc = textOrNull(doc.denominacion) ?? tipo;
      const persisted = await persistExpedienteDocumentoPdf({
        expedienteId,
        pdfDataUrl: pdf,
        originalName: textOrNull(doc.original_name ?? doc.originalName ?? doc.filename) ?? denomDoc,
      });
      await client.query(
        `INSERT INTO db_expediente_documentos
           (expediente_id, tipo, origen, denominacion, url, filename, size,
            fecha_documento, importe, notas, subido_por)
         VALUES ($1, $2, 'historico', $3, $4, $5, $6, $7::date, $8::numeric, $9, $10)`,
        [
          expedienteId,
          tipo,
          denomDoc,
          persisted.url,
          persisted.filename,
          persisted.bytes,
          dateOrNull(doc.fecha_documento ?? doc.fechaDocumento),
          moneyOrNull(doc.importe),
          textOrNull(doc.notas),
          userId(user),
        ],
      );
      documentosCreados += 1;
    }

    await client.query("COMMIT");
    const row = await loadSubvencion(expedienteId);
    res.status(201).json({
      ok: true,
      documentos_creados: documentosCreados,
      ...(row ? mapSubvencion(row) : {}),
    });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      //
    }
    console.error("[POST /admin/subvenciones/historico]", err);
    res.status(500).json({ error: "Error creando subvención histórica", detalle: String(err) });
  } finally {
    client.release();
  }
});

/** Avanzar el subestado administrativo de la subvención. */
router.post("/admin/subvenciones/:id/subestado", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!hasAnyRole(user, "contable")) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }
  const id = parseInt(String(req.params.id), 10);
  const subestado = String(req.body?.subestado ?? "").trim();
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id no válido" });
    return;
  }
  if (!isSubestado(subestado)) {
    res.status(400).json({ error: "subestado no válido", permitidos: SUBESTADOS });
    return;
  }
  try {
    await ensureSubvencionesSchema();
    const upd = await pool.query(
      `UPDATE db_expediente_subvencion s
          SET subestado = $1, actualizado_en = now()
        FROM db_expedientes e
       WHERE s.expediente_id = e.id
         AND s.expediente_id = $2
         AND e.tipologia = 'subvenciones'
       RETURNING s.*`,
      [subestado, id],
    );
    if (upd.rowCount === 0) {
      res.status(404).json({ error: "Subvención no encontrada" });
      return;
    }
    await pool.query("UPDATE db_expedientes SET actualizado_en = now() WHERE id = $1", [id]);
    res.json({ ok: true, subvencion: upd.rows[0] });
  } catch (err) {
    console.error("[POST /admin/subvenciones/:id/subestado]", err);
    res.status(500).json({ error: "Error actualizando subestado", detalle: String(err) });
  }
});

export default router;
