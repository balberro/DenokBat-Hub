import { Router, type IRouter } from "express";
import { db, pool } from "@workspace/db";
import {
  propuestasJuntaTable,
  sugerenciasTable,
  PROPUESTA_DECISIONES_SOLICITADAS,
  PROPUESTA_RESULTADOS,
  type PropuestaDecisionSolicitada,
  type PropuestaResultado,
} from "@workspace/db/schema";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import {
  persistAntecedentesPdf,
  deleteAntecedentesFile,
} from "../lib/propuestaAntecedentes";

/**
 * Plantilla para el campo "Descripción" de una propuesta a la junta (V2).
 * Se ofrece pre-rellenada para guiar a quien redacta: objetivo, necesidad,
 * pasos y beneficios. Es un único campo de texto con secciones legibles; no
 * se parsea en BBDD.
 */
const PLANTILLA_DESCRIPCION_PROPUESTA = [
  "**Objetivo**",
  "",
  "",
  "**Necesidad que cubre**",
  "",
  "",
  "**Pasos a dar**",
  "",
  "",
  "**Beneficios esperados**",
  "",
  "",
].join("\n");

const router: IRouter = Router();

function isDirectivo(role: string | undefined, roles: string[] | undefined): boolean {
  const all = Array.isArray(roles) && roles.length > 0 ? roles : [role ?? ""];
  return all.includes("directivo");
}

function isDecisionSolicitada(s: string): s is PropuestaDecisionSolicitada {
  return (PROPUESTA_DECISIONES_SOLICITADAS as readonly string[]).includes(s);
}

function isResultado(s: string): s is PropuestaResultado {
  return (PROPUESTA_RESULTADOS as readonly string[]).includes(s);
}

async function ensurePropuestasSchema(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS db_propuestas_junta (
        id                    SERIAL PRIMARY KEY,
        creado_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
        actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
        creado_por            INTEGER,
        origen_tipo           VARCHAR(40) NOT NULL DEFAULT 'sugerencia',
        origen_id             INTEGER,
        denominacion          VARCHAR(500) NOT NULL,
        descripcion           TEXT NOT NULL,
        decision_solicitada   VARCHAR(30) NOT NULL,
        estado_buzon          VARCHAR(30) NOT NULL DEFAULT 'pendiente',
        junta_id              INTEGER,
        resultado             VARCHAR(30),
        resuelta_en           TIMESTAMPTZ,
        expediente_id         INTEGER,
        observaciones         TEXT
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS db_propuestas_junta_estado_buzon_idx
        ON db_propuestas_junta (estado_buzon, creado_en DESC);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS db_propuestas_junta_origen_idx
        ON db_propuestas_junta (origen_tipo, origen_id);
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS db_propuestas_junta_sugerencia_activa_uq
        ON db_propuestas_junta (origen_id)
        WHERE origen_tipo = 'sugerencia'
          AND origen_id IS NOT NULL
          AND estado_buzon IN ('borrador', 'pendiente', 'en_orden_dia');
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS db_propuestas_junta_expediente_activa_uq
        ON db_propuestas_junta (origen_id)
        WHERE origen_tipo = 'expediente'
          AND origen_id IS NOT NULL
          AND estado_buzon IN ('borrador', 'pendiente', 'en_orden_dia');
    `);
    // V2: antecedentes (texto + adjunto PDF opcional). Idempotente.
    await pool.query(`
      ALTER TABLE db_propuestas_junta
        ADD COLUMN IF NOT EXISTS antecedentes              TEXT,
        ADD COLUMN IF NOT EXISTS antecedentes_url          TEXT,
        ADD COLUMN IF NOT EXISTS antecedentes_filename     TEXT,
        ADD COLUMN IF NOT EXISTS antecedentes_size         INTEGER,
        ADD COLUMN IF NOT EXISTS antecedentes_subido_en    TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS antecedentes_subido_por   INTEGER;
    `);
  } catch (e) {
    console.warn("[ensurePropuestasSchema]", e);
  }
}

type PropuestaRow = typeof propuestasJuntaTable.$inferSelect;

function mapPropuesta(row: PropuestaRow) {
  return {
    id: row.id,
    creado_en: row.creadoEn,
    actualizado_en: row.actualizadoEn,
    creado_por: row.creadoPor,
    origen_tipo: row.origenTipo,
    origen_id: row.origenId,
    denominacion: row.denominacion,
    descripcion: row.descripcion,
    decision_solicitada: row.decisionSolicitada,
    estado_buzon: row.estadoBuzon,
    junta_id: row.juntaId,
    resultado: row.resultado,
    resuelta_en: row.resueltaEn,
    expediente_id: row.expedienteId,
    observaciones: row.observaciones,
    antecedentes: row.antecedentes ?? null,
    antecedentes_url: row.antecedentesUrl ?? null,
    antecedentes_filename: row.antecedentesFilename ?? null,
    antecedentes_size: row.antecedentesSize ?? null,
    antecedentes_subido_en: row.antecedentesSubidoEn ?? null,
    antecedentes_subido_por: row.antecedentesSubidoPor ?? null,
  };
}

/**
 * Construye el bloque de **antecedentes** inicial a partir de la sugerencia
 * raíz y sus aportaciones. En V1 era el cuerpo de la descripción; en V2 la
 * descripción se reserva para la plantilla rellenable y este bloque pasa al
 * campo `antecedentes` de la propuesta.
 */
function buildAntecedentesInicialDesdeSugerencia(args: {
  sugerencia: typeof sugerenciasTable.$inferSelect;
  aportaciones: ReadonlyArray<typeof sugerenciasTable.$inferSelect>;
}): string {
  const { sugerencia, aportaciones } = args;
  const lines: string[] = [];

  lines.push((sugerencia.texto ?? "").trim());

  const datos: string[] = [];
  datos.push(`Sugerencia n.º ${sugerencia.numeroSugerencia ?? "?"}`);
  if (sugerencia.tema) datos.push(sugerencia.tema);
  if (sugerencia.fechaEntrada) {
    datos.push(new Date(sugerencia.fechaEntrada).toISOString().slice(0, 10));
  }
  if (sugerencia.aliasPublicacion) datos.push(`alias: ${sugerencia.aliasPublicacion}`);
  lines.push("");
  lines.push(`— ${datos.join(" · ")}`);

  if (aportaciones.length > 0) {
    lines.push("");
    lines.push(`--- Aportaciones (${aportaciones.length}) ---`);
    for (const a of aportaciones) {
      lines.push("");
      const alias = a.aliasPublicacion || a.nombreRemitente || "Anónimo";
      const fecha = a.fechaEntrada
        ? new Date(a.fechaEntrada).toISOString().slice(0, 10)
        : "";
      lines.push(`> Aportación · ${alias}${fecha ? ` · ${fecha}` : ""}`);
      lines.push((a.texto ?? "").trim());
    }
  }
  return lines.join("\n");
}

/** Lista del buzón. Filtros opcionales: estado_buzon, decision_solicitada, origen_tipo, origen_id, q. */
router.get("/admin/propuestas-junta", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!isDirectivo(user.role, user.roles)) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }
  try {
    await ensurePropuestasSchema();
    const filters: ReturnType<typeof eq>[] = [];
    const { estado_buzon, decision_solicitada, origen_tipo, origen_id } = req.query;
    if (typeof estado_buzon === "string" && estado_buzon.length > 0) {
      filters.push(eq(propuestasJuntaTable.estadoBuzon, estado_buzon));
    }
    if (
      typeof decision_solicitada === "string" &&
      isDecisionSolicitada(decision_solicitada)
    ) {
      filters.push(eq(propuestasJuntaTable.decisionSolicitada, decision_solicitada));
    }
    if (typeof origen_tipo === "string" && origen_tipo.length > 0) {
      filters.push(eq(propuestasJuntaTable.origenTipo, origen_tipo));
    }
    if (typeof origen_id === "string" && origen_id.length > 0) {
      const n = parseInt(origen_id, 10);
      if (Number.isFinite(n)) filters.push(eq(propuestasJuntaTable.origenId, n));
    }

    const rows = filters.length === 0
      ? await db
          .select()
          .from(propuestasJuntaTable)
          .orderBy(desc(propuestasJuntaTable.creadoEn))
      : await db
          .select()
          .from(propuestasJuntaTable)
          .where(and(...filters))
          .orderBy(desc(propuestasJuntaTable.creadoEn));

    res.json({ items: rows.map(mapPropuesta), total: rows.length });
  } catch (err) {
    console.error("[GET /admin/propuestas-junta]", err);
    res.status(500).json({ error: "Error consultando buzón", detalle: String(err) });
  }
});

/** Ficha. Devuelve también un snapshot de la sugerencia origen si existe. */
router.get("/admin/propuestas-junta/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!isDirectivo(user.role, user.roles)) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id no válido" });
    return;
  }
  try {
    await ensurePropuestasSchema();
    const [row] = await db
      .select()
      .from(propuestasJuntaTable)
      .where(eq(propuestasJuntaTable.id, id))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "Propuesta no encontrada" });
      return;
    }
    let origenSugerencia: unknown = null;
    if (row.origenTipo === "sugerencia" && row.origenId != null) {
      const [s] = await db
        .select()
        .from(sugerenciasTable)
        .where(eq(sugerenciasTable.id, row.origenId))
        .limit(1);
      if (s) origenSugerencia = s;
    }
    res.json({ propuesta: mapPropuesta(row), origen_sugerencia: origenSugerencia });
  } catch (err) {
    console.error("[GET /admin/propuestas-junta/:id]", err);
    res.status(500).json({ error: "Error", detalle: String(err) });
  }
});

/**
 * Devuelve denominación/descripción precargadas para una sugerencia raíz, sin escribir nada.
 * Útil para abrir el formulario con valores iniciales antes de confirmar.
 */
router.get(
  "/admin/propuestas-junta/preview/sugerencia/:sugerenciaId",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!isDirectivo(user.role, user.roles)) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const sugerenciaId = parseInt(String(req.params.sugerenciaId), 10);
    if (!Number.isFinite(sugerenciaId)) {
      res.status(400).json({ error: "Id de sugerencia no válido" });
      return;
    }
    try {
      const [root] = await db
        .select()
        .from(sugerenciasTable)
        .where(and(eq(sugerenciasTable.id, sugerenciaId), isNull(sugerenciasTable.parentId)))
        .limit(1);
      if (!root) {
        res
          .status(404)
          .json({ error: "Sugerencia raíz no encontrada (las aportaciones no pueden originar propuestas)" });
        return;
      }
      const aportaciones = await db
        .select()
        .from(sugerenciasTable)
        .where(eq(sugerenciasTable.parentId, root.id))
        .orderBy(asc(sugerenciasTable.fechaEntrada), asc(sugerenciasTable.id));

      const denominacion = (root.tema ?? "").trim() || `Sugerencia n.º ${root.numeroSugerencia ?? root.id}`;
      const antecedentes = buildAntecedentesInicialDesdeSugerencia({
        sugerencia: root,
        aportaciones,
      });

      res.json({
        sugerencia_id: root.id,
        numero_sugerencia: root.numeroSugerencia,
        estado_actual: root.estado,
        denominacion,
        descripcion: PLANTILLA_DESCRIPCION_PROPUESTA,
        antecedentes,
        aportaciones_count: aportaciones.length,
      });
    } catch (err) {
      console.error("[GET /admin/propuestas-junta/preview/...]", err);
      res.status(500).json({ error: "Error", detalle: String(err) });
    }
  },
);

/**
 * Devuelve denominación/descripción precargadas para un expediente existente,
 * sin escribir nada. Permite abrir el formulario de "Volver a presentar a la
 * junta" con valores iniciales.
 */
router.get(
  "/admin/propuestas-junta/preview/expediente/:expedienteId",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!isDirectivo(user.role, user.roles)) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const expedienteId = parseInt(String(req.params.expedienteId), 10);
    if (!Number.isFinite(expedienteId)) {
      res.status(400).json({ error: "Id de expediente no válido" });
      return;
    }
    try {
      const expRes = await pool.query(
        "SELECT * FROM db_expedientes WHERE id = $1",
        [expedienteId],
      );
      if (expRes.rowCount === 0) {
        res.status(404).json({ error: "Expediente no encontrado" });
        return;
      }
      const exp = expRes.rows[0] as Record<string, unknown>;
      const accRes = await pool.query(
        `SELECT a.descripcion, a.estado, a.plazo,
                u.nombre AS responsable_nombre, u.username AS responsable_username
           FROM db_expediente_acciones a
           LEFT JOIN db_users u ON u.id = a.responsable_user_id
          WHERE a.expediente_id = $1
          ORDER BY
            CASE a.estado WHEN 'pendiente' THEN 0 WHEN 'hecha' THEN 1 ELSE 2 END,
            a.plazo NULLS LAST,
            a.creado_en DESC`,
        [expedienteId],
      );

      const denominacion = String(exp.denominacion ?? "").trim() ||
        `Expediente n.º ${exp.numero ?? exp.id}`;
      const lines: string[] = [];
      lines.push(`Expediente n.º ${exp.numero ?? exp.id} — ${exp.denominacion ?? ""}`.trim());
      lines.push("");
      lines.push((String(exp.descripcion ?? "")).trim());
      if (accRes.rowCount && accRes.rowCount > 0) {
        lines.push("");
        lines.push(`--- Acciones del expediente (${accRes.rowCount}) ---`);
        for (const a of accRes.rows as Record<string, unknown>[]) {
          const resp = (a.responsable_nombre || a.responsable_username || "—") as string;
          const estado = String(a.estado ?? "");
          const plazo = a.plazo ? new Date(String(a.plazo)).toISOString().slice(0, 10) : "";
          lines.push(`• [${estado}] ${a.descripcion} (resp.: ${resp}${plazo ? `, plazo ${plazo}` : ""})`);
        }
      }
      res.json({
        expediente_id: expedienteId,
        numero: exp.numero,
        estado: exp.estado,
        denominacion,
        descripcion: PLANTILLA_DESCRIPCION_PROPUESTA,
        antecedentes: lines.join("\n"),
      });
    } catch (err) {
      console.error("[GET /admin/propuestas-junta/preview/expediente/...]", err);
      res.status(500).json({ error: "Error", detalle: String(err) });
    }
  },
);

/**
 * Crea una propuesta a la junta a partir de un expediente.
 *
 * Operación atómica: inserta la propuesta con `origen_tipo='expediente'` y
 * `origen_id=expediente_id`. El índice único parcial impide que un mismo
 * expediente tenga dos propuestas activas a la vez.
 */
router.post(
  "/admin/propuestas-junta/desde-expediente",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!isDirectivo(user.role, user.roles)) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const body = req.body ?? {};
    const expedienteId = parseInt(String(body.expediente_id ?? body.expedienteId ?? ""), 10);
    const denominacion = String(body.denominacion ?? "").trim();
    const descripcion = String(body.descripcion ?? "").trim();
    const decisionSolicitada = String(body.decision_solicitada ?? body.decisionSolicitada ?? "");
    const observaciones = String(body.observaciones ?? "").trim() || null;
    const antecedentes = body.antecedentes !== undefined
      ? String(body.antecedentes ?? "").trim() || null
      : null;
    // V2: `enviar_al_buzon` (default true) decide si la propuesta queda
    // como `borrador` (privada del directivo) o `pendiente` (en el buzón).
    const enviarAlBuzon = body.enviar_al_buzon !== false && body.enviarAlBuzon !== false;
    const estadoInicial = enviarAlBuzon ? "pendiente" : "borrador";

    if (!Number.isFinite(expedienteId)) {
      res.status(400).json({ error: "expediente_id no válido" });
      return;
    }
    if (denominacion.length < 2) {
      res.status(400).json({ error: "La denominación es obligatoria (mín. 2 caracteres)" });
      return;
    }
    if (descripcion.length < 4) {
      res.status(400).json({ error: "La descripción es obligatoria (mín. 4 caracteres)" });
      return;
    }
    if (!isDecisionSolicitada(decisionSolicitada)) {
      res.status(400).json({
        error: "decision_solicitada no válida",
        permitidas: PROPUESTA_DECISIONES_SOLICITADAS,
      });
      return;
    }

    const client = await pool.connect();
    try {
      await ensurePropuestasSchema();
      await client.query("BEGIN");

      const expRes = await client.query(
        "SELECT id, estado FROM db_expedientes WHERE id = $1 FOR UPDATE",
        [expedienteId],
      );
      if (expRes.rowCount === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Expediente no encontrado" });
        return;
      }

      const insertRes = await client.query(
        `INSERT INTO db_propuestas_junta
           (creado_por, origen_tipo, origen_id, denominacion, descripcion, decision_solicitada,
            estado_buzon, observaciones, antecedentes)
         VALUES ($1, 'expediente', $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          Number.isFinite(user.uid) ? user.uid : null,
          expedienteId,
          denominacion,
          descripcion,
          decisionSolicitada,
          estadoInicial,
          observaciones,
          antecedentes,
        ],
      );

      await client.query("COMMIT");
      res.status(201).json({ ok: true, propuesta: insertRes.rows[0] });
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {
        //
      }
      const msg = String((err as Error)?.message ?? err);
      if (msg.includes("db_propuestas_junta_expediente_activa_uq")) {
        res.status(409).json({
          error: "Este expediente ya tiene una propuesta activa en el buzón.",
          detalle: msg,
        });
        return;
      }
      console.error("[POST /admin/propuestas-junta/desde-expediente]", err);
      res.status(500).json({ error: "Error creando propuesta", detalle: msg });
    } finally {
      client.release();
    }
  },
);

/**
 * Crea una propuesta a la junta a partir de una sugerencia raíz.
 *
 * Operación atómica: en una sola transacción, marca la sugerencia raíz (y sus
 * aportaciones, por herencia de estado) como `presentada` y graba la fila
 * en `db_propuestas_junta`. Si ya hay una propuesta activa (pendiente o
 * en_orden_dia) para la misma sugerencia, falla con 409 gracias al
 * índice único parcial.
 */
router.post(
  "/admin/propuestas-junta/desde-sugerencia",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!isDirectivo(user.role, user.roles)) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const body = req.body ?? {};
    const sugerenciaId = parseInt(String(body.sugerencia_id ?? body.sugerenciaId ?? ""), 10);
    const denominacion = String(body.denominacion ?? "").trim();
    const descripcion = String(body.descripcion ?? "").trim();
    const decisionSolicitada = String(body.decision_solicitada ?? body.decisionSolicitada ?? "");
    const observaciones = String(body.observaciones ?? "").trim() || null;
    const antecedentes = body.antecedentes !== undefined
      ? String(body.antecedentes ?? "").trim() || null
      : null;
    // V2: `enviar_al_buzon` (default true) decide si la propuesta queda
    // como `borrador` (privada del directivo) o `pendiente` (en el buzón).
    const enviarAlBuzon = body.enviar_al_buzon !== false && body.enviarAlBuzon !== false;
    const estadoInicial = enviarAlBuzon ? "pendiente" : "borrador";

    if (!Number.isFinite(sugerenciaId)) {
      res.status(400).json({ error: "sugerencia_id no válido" });
      return;
    }
    if (denominacion.length < 2) {
      res.status(400).json({ error: "La denominación es obligatoria (mín. 2 caracteres)" });
      return;
    }
    if (descripcion.length < 4) {
      res.status(400).json({ error: "La descripción es obligatoria (mín. 4 caracteres)" });
      return;
    }
    if (!isDecisionSolicitada(decisionSolicitada)) {
      res.status(400).json({
        error: "decision_solicitada no válida",
        permitidas: PROPUESTA_DECISIONES_SOLICITADAS,
      });
      return;
    }

    const client = await pool.connect();
    try {
      await ensurePropuestasSchema();
      await client.query("BEGIN");

      const rootRes = await client.query(
        "SELECT * FROM db_sugerencias WHERE id = $1 AND parent_id IS NULL FOR UPDATE",
        [sugerenciaId],
      );
      if (rootRes.rowCount === 0) {
        await client.query("ROLLBACK");
        res
          .status(404)
          .json({ error: "Sugerencia raíz no encontrada (las aportaciones no pueden originar propuestas)" });
        return;
      }

      const insertRes = await client.query(
        `INSERT INTO db_propuestas_junta
           (creado_por, origen_tipo, origen_id, denominacion, descripcion, decision_solicitada,
            estado_buzon, observaciones, antecedentes)
         VALUES ($1, 'sugerencia', $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          Number.isFinite(user.uid) ? user.uid : null,
          sugerenciaId,
          denominacion,
          descripcion,
          decisionSolicitada,
          estadoInicial,
          observaciones,
          antecedentes,
        ],
      );

      // Solo marcamos la sugerencia origen como `presentada` cuando la
      // propuesta entra de verdad al buzón. En `borrador` la sugerencia se
      // queda en su estado anterior; pasará a `presentada` cuando el
      // directivo pulse "Presentar a la junta".
      if (enviarAlBuzon) {
        const ahora = new Date();
        await client.query(
          "UPDATE db_sugerencias SET estado = 'presentada', updated_at = $1 WHERE id = $2",
          [ahora, sugerenciaId],
        );
        await client.query(
          "UPDATE db_sugerencias SET estado = 'presentada', updated_at = $1 WHERE parent_id = $2",
          [ahora, sugerenciaId],
        );
      }

      await client.query("COMMIT");
      res.status(201).json({ ok: true, propuesta: insertRes.rows[0] });
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {
        //
      }
      const msg = String((err as Error)?.message ?? err);
      if (msg.includes("db_propuestas_junta_sugerencia_activa_uq")) {
        res.status(409).json({
          error: "Esta sugerencia ya tiene una propuesta activa en el buzón.",
          detalle: msg,
        });
        return;
      }
      console.error("[POST /admin/propuestas-junta/desde-sugerencia]", err);
      res.status(500).json({ error: "Error creando propuesta", detalle: msg });
    } finally {
      client.release();
    }
  },
);

/**
 * Editar denominación / descripción / decisión solicitada / observaciones.
 * Sólo permitido mientras la propuesta está `pendiente`.
 */
router.put("/admin/propuestas-junta/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!isDirectivo(user.role, user.roles)) {
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
    const [row] = await db
      .select()
      .from(propuestasJuntaTable)
      .where(eq(propuestasJuntaTable.id, id))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "Propuesta no encontrada" });
      return;
    }
    if (row.estadoBuzon !== "pendiente" && row.estadoBuzon !== "borrador") {
      res.status(409).json({
        error: "Solo se puede editar mientras la propuesta está en borrador o pendiente",
        estado_buzon: row.estadoBuzon,
      });
      return;
    }

    const patch: Partial<typeof propuestasJuntaTable.$inferInsert> = {
      actualizadoEn: new Date(),
    };
    if (body.denominacion !== undefined) {
      const v = String(body.denominacion ?? "").trim();
      if (v.length < 2) {
        res.status(400).json({ error: "La denominación es obligatoria (mín. 2 caracteres)" });
        return;
      }
      patch.denominacion = v;
    }
    if (body.descripcion !== undefined) {
      const v = String(body.descripcion ?? "").trim();
      if (v.length < 4) {
        res.status(400).json({ error: "La descripción es obligatoria (mín. 4 caracteres)" });
        return;
      }
      patch.descripcion = v;
    }
    if (body.decision_solicitada !== undefined) {
      const v = String(body.decision_solicitada);
      if (!isDecisionSolicitada(v)) {
        res.status(400).json({
          error: "decision_solicitada no válida",
          permitidas: PROPUESTA_DECISIONES_SOLICITADAS,
        });
        return;
      }
      patch.decisionSolicitada = v;
    }
    if (body.observaciones !== undefined) {
      patch.observaciones = String(body.observaciones ?? "").trim() || null;
    }
    if (body.antecedentes !== undefined) {
      patch.antecedentes = String(body.antecedentes ?? "").trim() || null;
    }

    await db.update(propuestasJuntaTable).set(patch).where(eq(propuestasJuntaTable.id, id));
    const [updated] = await db
      .select()
      .from(propuestasJuntaTable)
      .where(eq(propuestasJuntaTable.id, id))
      .limit(1);
    res.json(mapPropuesta(updated));
  } catch (err) {
    console.error("[PUT /admin/propuestas-junta/:id]", err);
    res.status(500).json({ error: "Error actualizando propuesta", detalle: String(err) });
  }
});

/**
 * Pasa una propuesta en estado `borrador` a `pendiente` (la "presenta al
 * buzón"). Si la propuesta procede de una sugerencia, propaga el estado
 * `presentada` a la raíz y a sus aportaciones (regla de herencia).
 */
router.post(
  "/admin/propuestas-junta/:id/presentar",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!isDirectivo(user.role, user.roles)) {
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
      await ensurePropuestasSchema();
      await client.query("BEGIN");
      const propRes = await client.query(
        "SELECT * FROM db_propuestas_junta WHERE id = $1 FOR UPDATE",
        [id],
      );
      if (propRes.rowCount === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Propuesta no encontrada" });
        return;
      }
      const prop = propRes.rows[0] as Record<string, unknown>;
      if (prop.estado_buzon !== "borrador") {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "Solo se pueden presentar propuestas en estado borrador",
          estado_buzon: prop.estado_buzon,
        });
        return;
      }
      const ahora = new Date();
      const updRes = await client.query(
        `UPDATE db_propuestas_junta
            SET estado_buzon = 'pendiente', actualizado_en = $1
          WHERE id = $2
          RETURNING *`,
        [ahora, id],
      );
      if (prop.origen_tipo === "sugerencia" && prop.origen_id != null) {
        const sugId = Number(prop.origen_id);
        if (Number.isFinite(sugId)) {
          await client.query(
            "UPDATE db_sugerencias SET estado = 'presentada', updated_at = $1 WHERE id = $2",
            [ahora, sugId],
          );
          await client.query(
            "UPDATE db_sugerencias SET estado = 'presentada', updated_at = $1 WHERE parent_id = $2",
            [ahora, sugId],
          );
        }
      }
      await client.query("COMMIT");
      res.json({ ok: true, propuesta: updRes.rows[0] });
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {
        //
      }
      console.error("[POST .../presentar]", err);
      res.status(500).json({ error: "Error presentando propuesta", detalle: String(err) });
    } finally {
      client.release();
    }
  },
);

/** Marca la propuesta como incluida en el orden del día (opcional: junta_id). */
router.post(
  "/admin/propuestas-junta/:id/incluir-orden-dia",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!isDirectivo(user.role, user.roles)) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Id no válido" });
      return;
    }
    const body = req.body ?? {};
    const juntaIdRaw = body.junta_id ?? body.juntaId;
    const juntaId = juntaIdRaw != null ? parseInt(String(juntaIdRaw), 10) : null;

    try {
      const [row] = await db
        .select()
        .from(propuestasJuntaTable)
        .where(eq(propuestasJuntaTable.id, id))
        .limit(1);
      if (!row) {
        res.status(404).json({ error: "Propuesta no encontrada" });
        return;
      }
      if (row.estadoBuzon === "resuelta") {
        res
          .status(409)
          .json({ error: "La propuesta ya está resuelta; no se puede mover de orden del día" });
        return;
      }
      await db
        .update(propuestasJuntaTable)
        .set({
          estadoBuzon: "en_orden_dia",
          juntaId: Number.isFinite(juntaId) ? juntaId : null,
          actualizadoEn: new Date(),
        })
        .where(eq(propuestasJuntaTable.id, id));
      const [updated] = await db
        .select()
        .from(propuestasJuntaTable)
        .where(eq(propuestasJuntaTable.id, id))
        .limit(1);
      res.json(mapPropuesta(updated));
    } catch (err) {
      console.error("[POST .../incluir-orden-dia]", err);
      res.status(500).json({ error: "Error", detalle: String(err) });
    }
  },
);

/** Vuelve la propuesta a estado pendiente (corrección si se incluyó por error). */
router.post(
  "/admin/propuestas-junta/:id/reabrir",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!isDirectivo(user.role, user.roles)) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Id no válido" });
      return;
    }
    try {
      const [row] = await db
        .select()
        .from(propuestasJuntaTable)
        .where(eq(propuestasJuntaTable.id, id))
        .limit(1);
      if (!row) {
        res.status(404).json({ error: "Propuesta no encontrada" });
        return;
      }
      if (row.estadoBuzon === "resuelta") {
        res.status(409).json({ error: "La propuesta ya está resuelta y no se puede reabrir" });
        return;
      }
      await db
        .update(propuestasJuntaTable)
        .set({ estadoBuzon: "pendiente", juntaId: null, actualizadoEn: new Date() })
        .where(eq(propuestasJuntaTable.id, id));
      const [updated] = await db
        .select()
        .from(propuestasJuntaTable)
        .where(eq(propuestasJuntaTable.id, id))
        .limit(1);
      res.json(mapPropuesta(updated));
    } catch (err) {
      console.error("[POST .../reabrir]", err);
      res.status(500).json({ error: "Error", detalle: String(err) });
    }
  },
);

/**
 * Resuelve la propuesta tras la junta y propaga el efecto a la sugerencia origen.
 *
 * Body:
 *   - resultado: 'rechazada' | 'mas_aportaciones' | 'expediente_abierto'
 *   - observaciones?: string
 *   - expediente_id?: number (solo para 'expediente_abierto'; reservado hasta gestor de expedientes)
 */
router.post(
  "/admin/propuestas-junta/:id/resolver",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!isDirectivo(user.role, user.roles)) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Id no válido" });
      return;
    }
    const body = req.body ?? {};
    const resultado = String(body.resultado ?? "");
    if (!isResultado(resultado)) {
      res.status(400).json({
        error: "resultado no válido",
        permitidos: PROPUESTA_RESULTADOS,
      });
      return;
    }
    const observaciones = body.observaciones !== undefined
      ? String(body.observaciones ?? "").trim() || null
      : undefined;
    const expedienteIdRaw = body.expediente_id ?? body.expedienteId;
    const expedienteId = expedienteIdRaw != null ? parseInt(String(expedienteIdRaw), 10) : null;

    const client = await pool.connect();
    try {
      await ensurePropuestasSchema();
      await client.query("BEGIN");

      const propRes = await client.query(
        "SELECT * FROM db_propuestas_junta WHERE id = $1 FOR UPDATE",
        [id],
      );
      if (propRes.rowCount === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Propuesta no encontrada" });
        return;
      }
      const prop = propRes.rows[0] as Record<string, unknown>;
      if (prop.estado_buzon === "resuelta") {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "La propuesta ya está resuelta" });
        return;
      }

      // Mapear resultado → estado destino de la sugerencia raíz.
      let nuevoEstadoSugerencia: "rechazada" | "aportaciones" | "planificada" | null = null;
      if (resultado === "rechazada") nuevoEstadoSugerencia = "rechazada";
      else if (resultado === "mas_aportaciones") nuevoEstadoSugerencia = "aportaciones";
      else if (resultado === "expediente_abierto") nuevoEstadoSugerencia = "planificada";

      const ahora = new Date();
      const expedienteIdParam = Number.isFinite(expedienteId) ? expedienteId : null;
      // Si `observaciones` no se envía en el body, conservamos las actuales.
      const updRes = await client.query(
        `UPDATE db_propuestas_junta
            SET estado_buzon = 'resuelta',
                resultado = $1,
                resuelta_en = $2,
                actualizado_en = $2,
                expediente_id = COALESCE($3, expediente_id),
                observaciones = CASE WHEN $4::boolean THEN $5 ELSE observaciones END
          WHERE id = $6
          RETURNING *`,
        [
          resultado,
          ahora,
          expedienteIdParam,
          observaciones !== undefined,
          observaciones ?? null,
          id,
        ],
      );

      // Propagación a la sugerencia origen + aportaciones (regla de herencia).
      if (
        prop.origen_tipo === "sugerencia" &&
        prop.origen_id != null &&
        nuevoEstadoSugerencia !== null
      ) {
        const sugId = Number(prop.origen_id);
        if (Number.isFinite(sugId)) {
          if (resultado === "expediente_abierto") {
            await client.query(
              "UPDATE db_sugerencias SET estado = $1, expediente_id = COALESCE($2, expediente_id), updated_at = $3 WHERE id = $4",
              [nuevoEstadoSugerencia, Number.isFinite(expedienteId) ? expedienteId : null, ahora, sugId],
            );
          } else {
            await client.query(
              "UPDATE db_sugerencias SET estado = $1, updated_at = $2 WHERE id = $3",
              [nuevoEstadoSugerencia, ahora, sugId],
            );
          }
          await client.query(
            "UPDATE db_sugerencias SET estado = $1, updated_at = $2 WHERE parent_id = $3",
            [nuevoEstadoSugerencia, ahora, sugId],
          );
        }
      }

      await client.query("COMMIT");
      res.json({ ok: true, propuesta: updRes.rows[0] });
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {
        //
      }
      console.error("[POST .../resolver]", err);
      res.status(500).json({ error: "Error resolviendo propuesta", detalle: String(err) });
    } finally {
      client.release();
    }
  },
);

/**
 * Sube un PDF como adjunto de antecedentes. Si ya había uno previo, intenta
 * borrarlo del disco antes de registrar el nuevo. Solo permitido mientras la
 * propuesta está `pendiente` (no se modifican antecedentes con la propuesta
 * en el orden del día o resuelta).
 */
router.post(
  "/admin/propuestas-junta/:id/antecedentes-adjunto",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!isDirectivo(user.role, user.roles)) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Id no válido" });
      return;
    }
    const body = req.body ?? {};
    const pdfDataUrl = String(body.pdf_data_url ?? body.pdfDataUrl ?? "").trim();
    const originalName = body.original_name ?? body.originalName ?? null;
    if (!pdfDataUrl) {
      res.status(400).json({ error: "pdf_data_url es obligatorio" });
      return;
    }
    try {
      await ensurePropuestasSchema();
      const [row] = await db
        .select()
        .from(propuestasJuntaTable)
        .where(eq(propuestasJuntaTable.id, id))
        .limit(1);
      if (!row) {
        res.status(404).json({ error: "Propuesta no encontrada" });
        return;
      }
      if (row.estadoBuzon !== "pendiente" && row.estadoBuzon !== "borrador") {
        res.status(409).json({
          error: "Solo se puede modificar el adjunto mientras la propuesta está en borrador o pendiente",
          estado_buzon: row.estadoBuzon,
        });
        return;
      }

      const persisted = await persistAntecedentesPdf({
        pdfDataUrl,
        propuestaId: id,
        originalName: typeof originalName === "string" ? originalName : null,
      });

      if (row.antecedentesUrl) {
        await deleteAntecedentesFile(row.antecedentesUrl);
      }

      await db
        .update(propuestasJuntaTable)
        .set({
          antecedentesUrl: persisted.url,
          antecedentesFilename: persisted.filename,
          antecedentesSize: persisted.bytes,
          antecedentesSubidoEn: new Date(),
          antecedentesSubidoPor: Number.isFinite(user.uid) ? user.uid : null,
          actualizadoEn: new Date(),
        })
        .where(eq(propuestasJuntaTable.id, id));

      const [updated] = await db
        .select()
        .from(propuestasJuntaTable)
        .where(eq(propuestasJuntaTable.id, id))
        .limit(1);
      res.status(201).json({ ok: true, propuesta: mapPropuesta(updated) });
    } catch (err) {
      console.error("[POST .../antecedentes-adjunto]", err);
      res
        .status(500)
        .json({ error: "Error subiendo el adjunto", detalle: String((err as Error)?.message ?? err) });
    }
  },
);

/** Borra el adjunto de antecedentes (si lo hay). */
router.delete(
  "/admin/propuestas-junta/:id/antecedentes-adjunto",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!isDirectivo(user.role, user.roles)) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Id no válido" });
      return;
    }
    try {
      const [row] = await db
        .select()
        .from(propuestasJuntaTable)
        .where(eq(propuestasJuntaTable.id, id))
        .limit(1);
      if (!row) {
        res.status(404).json({ error: "Propuesta no encontrada" });
        return;
      }
      if (row.estadoBuzon !== "pendiente" && row.estadoBuzon !== "borrador") {
        res.status(409).json({
          error: "Solo se puede borrar el adjunto mientras la propuesta está en borrador o pendiente",
          estado_buzon: row.estadoBuzon,
        });
        return;
      }
      if (row.antecedentesUrl) {
        await deleteAntecedentesFile(row.antecedentesUrl);
      }
      await db
        .update(propuestasJuntaTable)
        .set({
          antecedentesUrl: null,
          antecedentesFilename: null,
          antecedentesSize: null,
          antecedentesSubidoEn: null,
          antecedentesSubidoPor: null,
          actualizadoEn: new Date(),
        })
        .where(eq(propuestasJuntaTable.id, id));
      const [updated] = await db
        .select()
        .from(propuestasJuntaTable)
        .where(eq(propuestasJuntaTable.id, id))
        .limit(1);
      res.json({ ok: true, propuesta: mapPropuesta(updated) });
    } catch (err) {
      console.error("[DELETE .../antecedentes-adjunto]", err);
      res.status(500).json({ error: "Error borrando el adjunto", detalle: String(err) });
    }
  },
);

// Mantengo `sql` importado para Drizzle helpers futuros sin warning.
void sql;

export default router;
