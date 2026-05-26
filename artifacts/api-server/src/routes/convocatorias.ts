import { Router, type IRouter } from "express";
import { db, pool } from "@workspace/db";
import {
  convocatoriasTable,
  convocatoriaPuntosTable,
  propuestasJuntaTable,
  CONVOCATORIA_ESTADOS,
  CONVOCATORIA_TIPOS,
  type ConvocatoriaEstado,
  type ConvocatoriaTipo,
} from "@workspace/db/schema";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

/**
 * Acceso al módulo (V1):
 *   - Lectura:  directivo + contable
 *   - Escritura: contable
 *   (El directivo recibe la convocatoria; el contable la prepara.)
 */
function rolesOf(user: { role?: string; roles?: string[] }): string[] {
  if (Array.isArray(user.roles) && user.roles.length > 0) return user.roles;
  if (user.role) return [user.role];
  return [];
}
function hasAnyRole(user: { role?: string; roles?: string[] }, ...allowed: string[]): boolean {
  const rs = rolesOf(user);
  return allowed.some((r) => rs.includes(r));
}
function puedeLeer(user: { role?: string; roles?: string[] }): boolean {
  return hasAnyRole(user, "directivo", "contable");
}
function puedeEscribir(user: { role?: string; roles?: string[] }): boolean {
  return hasAnyRole(user, "contable");
}

function isEstado(s: string): s is ConvocatoriaEstado {
  return (CONVOCATORIA_ESTADOS as readonly string[]).includes(s);
}
function isTipo(s: string): s is ConvocatoriaTipo {
  return (CONVOCATORIA_TIPOS as readonly string[]).includes(s);
}

function labelDecisionSolicitada(decision: string | null | undefined): string {
  if (decision === "rechazada") return "Rechazar";
  if (decision === "mas_aportaciones") return "Más aportaciones";
  if (decision === "abrir_expediente") return "Abrir expediente";
  return decision ? String(decision) : "";
}

function descripcionPropuestaParaOrdenDia(args: {
  descripcion?: string | null;
  decisionSolicitada?: string | null;
}): string | null {
  const partes: string[] = [];
  const descripcion = String(args.descripcion ?? "").trim();
  if (descripcion) partes.push(descripcion);
  const solicitud = labelDecisionSolicitada(args.decisionSolicitada);
  if (solicitud) partes.push(`Solicitud concreta: ${solicitud}`);
  return partes.length > 0 ? partes.join("\n\n") : null;
}

async function ensureConvocatoriasSchema(): Promise<void> {
  try {
    await pool.query(`CREATE SEQUENCE IF NOT EXISTS db_convocatorias_numero_seq`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS db_convocatorias (
        id                SERIAL PRIMARY KEY,
        numero            INTEGER UNIQUE,
        tipo              VARCHAR(40) NOT NULL DEFAULT 'junta_directiva',
        titulo            VARCHAR(500) NOT NULL,
        fecha             DATE,
        hora              VARCHAR(20),
        lugar             VARCHAR(500),
        estado            VARCHAR(30) NOT NULL DEFAULT 'borrador',
        observaciones     TEXT,
        publicada_en      TIMESTAMPTZ,
        celebrada_en      TIMESTAMPTZ,
        creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
        actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
        creado_por        INTEGER
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS db_convocatoria_puntos (
        id              SERIAL PRIMARY KEY,
        convocatoria_id INTEGER NOT NULL,
        orden           INTEGER NOT NULL DEFAULT 0,
        propuesta_id    INTEGER,
        titulo          VARCHAR(500),
        descripcion     TEXT,
        notas           TEXT,
        creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query(
      `CREATE INDEX IF NOT EXISTS db_convocatorias_estado_idx
         ON db_convocatorias (estado, fecha DESC NULLS LAST, creado_en DESC)`,
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS db_convocatoria_puntos_convocatoria_idx
         ON db_convocatoria_puntos (convocatoria_id, orden, id)`,
    );
    await pool.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS db_convocatoria_puntos_propuesta_uq
         ON db_convocatoria_puntos (propuesta_id)
         WHERE propuesta_id IS NOT NULL`,
    );
    // V2: antecedentes snapshot del orden del día (NO se llevan al acta).
    await pool.query(`
      ALTER TABLE db_convocatoria_puntos
        ADD COLUMN IF NOT EXISTS antecedentes          TEXT,
        ADD COLUMN IF NOT EXISTS antecedentes_url      TEXT,
        ADD COLUMN IF NOT EXISTS antecedentes_filename TEXT;
    `);
  } catch (e) {
    console.warn("[ensureConvocatoriasSchema]", e);
  }
}

type ConvocatoriaRow = typeof convocatoriasTable.$inferSelect;
type PuntoRow = typeof convocatoriaPuntosTable.$inferSelect;
type PropuestaRow = typeof propuestasJuntaTable.$inferSelect;

function mapConvocatoria(row: ConvocatoriaRow) {
  return {
    id: row.id,
    numero: row.numero,
    tipo: row.tipo,
    titulo: row.titulo,
    fecha: row.fecha,
    hora: row.hora,
    lugar: row.lugar,
    estado: row.estado,
    observaciones: row.observaciones,
    publicada_en: row.publicadaEn,
    celebrada_en: row.celebradaEn,
    creado_en: row.creadoEn,
    actualizado_en: row.actualizadoEn,
    creado_por: row.creadoPor,
  };
}

function mapPunto(row: PuntoRow, propuesta?: PropuestaRow | null) {
  return {
    id: row.id,
    convocatoria_id: row.convocatoriaId,
    orden: row.orden,
    propuesta_id: row.propuestaId,
    titulo: row.titulo,
    descripcion: row.descripcion,
    notas: row.notas,
    antecedentes: row.antecedentes ?? null,
    antecedentes_url: row.antecedentesUrl ?? null,
    antecedentes_filename: row.antecedentesFilename ?? null,
    creado_en: row.creadoEn,
    propuesta: propuesta
      ? {
          id: propuesta.id,
          denominacion: propuesta.denominacion,
          descripcion: propuesta.descripcion,
          decision_solicitada: propuesta.decisionSolicitada,
          estado_buzon: propuesta.estadoBuzon,
        }
      : null,
  };
}

/** Listado. Filtros: estado, tipo. */
router.get("/admin/convocatorias", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!puedeLeer(user)) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }
  try {
    await ensureConvocatoriasSchema();
    const filters: ReturnType<typeof eq>[] = [];
    const { estado, tipo } = req.query;
    if (typeof estado === "string" && isEstado(estado)) {
      filters.push(eq(convocatoriasTable.estado, estado));
    }
    if (typeof tipo === "string" && tipo.length > 0) {
      filters.push(eq(convocatoriasTable.tipo, tipo));
    }
    const rows =
      filters.length === 0
        ? await db
            .select()
            .from(convocatoriasTable)
            .orderBy(desc(convocatoriasTable.fecha), desc(convocatoriasTable.creadoEn))
        : await db
            .select()
            .from(convocatoriasTable)
            .where(and(...filters))
            .orderBy(desc(convocatoriasTable.fecha), desc(convocatoriasTable.creadoEn));
    res.json({ items: rows.map(mapConvocatoria), total: rows.length });
  } catch (err) {
    console.error("[GET /admin/convocatorias]", err);
    res.status(500).json({ error: "Error consultando convocatorias", detalle: String(err) });
  }
});

/**
 * Propuestas disponibles para incluir en el orden del día: aquellas en el buzón
 * en estado `pendiente` (no resueltas, ni ya incluidas en otra convocatoria).
 */
router.get(
  "/admin/convocatorias/propuestas-disponibles",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!puedeLeer(user)) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    try {
      await ensureConvocatoriasSchema();
      const rows = await db
        .select()
        .from(propuestasJuntaTable)
        .where(eq(propuestasJuntaTable.estadoBuzon, "pendiente"))
        .orderBy(asc(propuestasJuntaTable.creadoEn));
      res.json({ items: rows.map((p) => ({
        id: p.id,
        denominacion: p.denominacion,
        descripcion: p.descripcion,
        decision_solicitada: p.decisionSolicitada,
        origen_tipo: p.origenTipo,
        origen_id: p.origenId,
      })), total: rows.length });
    } catch (err) {
      console.error("[GET .../propuestas-disponibles]", err);
      res.status(500).json({ error: "Error", detalle: String(err) });
    }
  },
);

/** Ficha + puntos (con datos de la propuesta enlazada cuando aplique). */
router.get("/admin/convocatorias/:id", requireAuth, async (req, res): Promise<void> => {
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
    await ensureConvocatoriasSchema();
    const [conv] = await db
      .select()
      .from(convocatoriasTable)
      .where(eq(convocatoriasTable.id, id))
      .limit(1);
    if (!conv) {
      res.status(404).json({ error: "Convocatoria no encontrada" });
      return;
    }
    const puntos = await db
      .select()
      .from(convocatoriaPuntosTable)
      .where(eq(convocatoriaPuntosTable.convocatoriaId, id))
      .orderBy(asc(convocatoriaPuntosTable.orden), asc(convocatoriaPuntosTable.id));

    const propIds = puntos
      .map((p) => p.propuestaId)
      .filter((v): v is number => typeof v === "number");
    const propMap = new Map<number, PropuestaRow>();
    if (propIds.length > 0) {
      // Drizzle inArray para mantener tipado; aquí usamos query simple por simplicidad.
      const propRows = await pool.query(
        `SELECT * FROM db_propuestas_junta WHERE id = ANY($1::int[])`,
        [propIds],
      );
      for (const row of propRows.rows as Record<string, unknown>[]) {
        const r: PropuestaRow = {
          id: Number(row.id),
          creadoEn: row.creado_en as Date,
          actualizadoEn: row.actualizado_en as Date,
          creadoPor: row.creado_por as number | null,
          origenTipo: String(row.origen_tipo),
          origenId: row.origen_id as number | null,
          denominacion: String(row.denominacion),
          descripcion: String(row.descripcion),
          decisionSolicitada: String(row.decision_solicitada),
          estadoBuzon: String(row.estado_buzon),
          juntaId: row.junta_id as number | null,
          resultado: row.resultado as string | null,
          resueltaEn: row.resuelta_en as Date | null,
          expedienteId: row.expediente_id as number | null,
          observaciones: row.observaciones as string | null,
        };
        propMap.set(r.id, r);
      }
    }
    const puntosOut = puntos.map((p) =>
      mapPunto(p, p.propuestaId != null ? propMap.get(p.propuestaId) ?? null : null),
    );

    res.json({ convocatoria: mapConvocatoria(conv), puntos: puntosOut });
  } catch (err) {
    console.error("[GET /admin/convocatorias/:id]", err);
    res.status(500).json({ error: "Error", detalle: String(err) });
  }
});

/**
 * Crear convocatoria (estado inicial 'borrador').
 * Body: { tipo, titulo, fecha?, hora?, lugar?, observaciones? }
 */
router.post("/admin/convocatorias", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!puedeEscribir(user)) {
    res
      .status(403)
      .json({ error: "La creación de convocatorias está reservada al rol contable." });
    return;
  }
  const body = req.body ?? {};
  const tipo = String(body.tipo ?? "junta_directiva").trim();
  const titulo = String(body.titulo ?? "").trim();
  const fechaRaw = String(body.fecha ?? "").trim();
  const fecha = fechaRaw.length > 0 ? fechaRaw : null;
  const hora = String(body.hora ?? "").trim() || null;
  const lugar = String(body.lugar ?? "").trim() || null;
  const observaciones = String(body.observaciones ?? "").trim() || null;

  if (!isTipo(tipo)) {
    res.status(400).json({ error: "tipo no válido", permitidos: CONVOCATORIA_TIPOS });
    return;
  }
  if (titulo.length < 2) {
    res.status(400).json({ error: "El título es obligatorio (mín. 2 caracteres)" });
    return;
  }
  try {
    await ensureConvocatoriasSchema();
    const insertRes = await pool.query(
      `INSERT INTO db_convocatorias
         (numero, tipo, titulo, fecha, hora, lugar, estado, observaciones, creado_por)
       VALUES (
         nextval('db_convocatorias_numero_seq')::int,
         $1, $2, $3::date, $4, $5, 'borrador', $6, $7)
       RETURNING *`,
      [
        tipo,
        titulo,
        fecha,
        hora,
        lugar,
        observaciones,
        Number.isFinite(user.uid) ? user.uid : null,
      ],
    );
    res.status(201).json({ ok: true, convocatoria: insertRes.rows[0] });
  } catch (err) {
    console.error("[POST /admin/convocatorias]", err);
    res.status(500).json({ error: "Error creando convocatoria", detalle: String(err) });
  }
});

/**
 * Editar cabecera (título, tipo, fecha, hora, lugar, observaciones).
 * Permitido en estado 'borrador' o 'publicada'. No en 'celebrada'.
 */
router.put("/admin/convocatorias/:id", requireAuth, async (req, res): Promise<void> => {
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
    const [row] = await db
      .select()
      .from(convocatoriasTable)
      .where(eq(convocatoriasTable.id, id))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "Convocatoria no encontrada" });
      return;
    }
    if (row.estado === "celebrada") {
      res.status(409).json({
        error: "Una convocatoria celebrada no se puede modificar",
        estado: row.estado,
      });
      return;
    }
    const patch: Partial<typeof convocatoriasTable.$inferInsert> = {
      actualizadoEn: new Date(),
    };
    if (body.tipo !== undefined) {
      const v = String(body.tipo).trim();
      if (!isTipo(v)) {
        res.status(400).json({ error: "tipo no válido", permitidos: CONVOCATORIA_TIPOS });
        return;
      }
      patch.tipo = v;
    }
    if (body.titulo !== undefined) {
      const v = String(body.titulo ?? "").trim();
      if (v.length < 2) {
        res.status(400).json({ error: "El título es obligatorio (mín. 2 caracteres)" });
        return;
      }
      patch.titulo = v;
    }
    if (body.fecha !== undefined) {
      const v = String(body.fecha ?? "").trim();
      patch.fecha = v.length > 0 ? v : null;
    }
    if (body.hora !== undefined) {
      const v = String(body.hora ?? "").trim();
      patch.hora = v.length > 0 ? v : null;
    }
    if (body.lugar !== undefined) {
      const v = String(body.lugar ?? "").trim();
      patch.lugar = v.length > 0 ? v : null;
    }
    if (body.observaciones !== undefined) {
      const v = String(body.observaciones ?? "").trim();
      patch.observaciones = v.length > 0 ? v : null;
    }
    await db.update(convocatoriasTable).set(patch).where(eq(convocatoriasTable.id, id));
    const [updated] = await db
      .select()
      .from(convocatoriasTable)
      .where(eq(convocatoriasTable.id, id))
      .limit(1);
    res.json(mapConvocatoria(updated));
  } catch (err) {
    console.error("[PUT /admin/convocatorias/:id]", err);
    res.status(500).json({ error: "Error actualizando convocatoria", detalle: String(err) });
  }
});

/**
 * Borrar convocatoria. Solo permitido si está en 'borrador'.
 * Si tiene puntos ligados a propuestas, esos puntos se eliminan en cascada y
 * las propuestas vuelven a 'pendiente' (gestionado en transacción).
 */
router.delete("/admin/convocatorias/:id", requireAuth, async (req, res): Promise<void> => {
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
    await ensureConvocatoriasSchema();
    await client.query("BEGIN");
    const convRes = await client.query(
      "SELECT estado FROM db_convocatorias WHERE id = $1 FOR UPDATE",
      [id],
    );
    if (convRes.rowCount === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Convocatoria no encontrada" });
      return;
    }
    if (convRes.rows[0].estado !== "borrador") {
      await client.query("ROLLBACK");
      res
        .status(409)
        .json({ error: "Solo se puede borrar una convocatoria en 'borrador'", estado: convRes.rows[0].estado });
      return;
    }
    // Devolver propuestas asociadas al buzón.
    await client.query(
      `UPDATE db_propuestas_junta
          SET estado_buzon = 'pendiente', junta_id = NULL, actualizado_en = now()
        WHERE id IN (
          SELECT propuesta_id FROM db_convocatoria_puntos
           WHERE convocatoria_id = $1 AND propuesta_id IS NOT NULL
        )`,
      [id],
    );
    await client.query("DELETE FROM db_convocatorias WHERE id = $1", [id]);
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      //
    }
    console.error("[DELETE /admin/convocatorias/:id]", err);
    res.status(500).json({ error: "Error borrando convocatoria", detalle: String(err) });
  } finally {
    client.release();
  }
});

/**
 * Añadir un punto al orden del día.
 * Body: { propuesta_id? | titulo, descripcion?, notas?, orden? }
 *
 * Si `propuesta_id` está informado:
 *   - La propuesta debe estar en estado `pendiente`.
 *   - Operación atómica: inserta el punto y actualiza la propuesta a
 *     `en_orden_dia` + `junta_id = convocatoria_id`.
 * Si no, el `titulo` es obligatorio (punto libre).
 */
router.post(
  "/admin/convocatorias/:id/puntos",
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
    const body = req.body ?? {};
    const propuestaIdRaw = body.propuesta_id ?? body.propuestaId;
    const propuestaId =
      propuestaIdRaw != null && String(propuestaIdRaw).length > 0
        ? parseInt(String(propuestaIdRaw), 10)
        : null;
    const titulo = String(body.titulo ?? "").trim();
    const descripcion = String(body.descripcion ?? "").trim() || null;
    const notas = String(body.notas ?? "").trim() || null;
    const ordenRaw = body.orden;
    const ordenManual = ordenRaw != null ? parseInt(String(ordenRaw), 10) : null;

    if (propuestaId == null && titulo.length < 2) {
      res.status(400).json({
        error: "Indique una propuesta o un título de punto libre (mín. 2 caracteres)",
      });
      return;
    }

    const client = await pool.connect();
    try {
      await ensureConvocatoriasSchema();
      await client.query("BEGIN");

      const convRes = await client.query(
        "SELECT estado FROM db_convocatorias WHERE id = $1 FOR UPDATE",
        [id],
      );
      if (convRes.rowCount === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Convocatoria no encontrada" });
        return;
      }
      if (convRes.rows[0].estado === "celebrada") {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "No se pueden añadir puntos a una convocatoria celebrada",
        });
        return;
      }

      // Snapshot de antecedentes de la propuesta (si origen=propuesta).
      let propTitulo: string | null = null;
      let propDescripcion: string | null = null;
      let propAntecedentes: string | null = null;
      let propAntecedentesUrl: string | null = null;
      let propAntecedentesFilename: string | null = null;
      if (propuestaId != null) {
        const propRes = await client.query(
          `SELECT estado_buzon, denominacion, descripcion, decision_solicitada,
                  antecedentes, antecedentes_url, antecedentes_filename
             FROM db_propuestas_junta WHERE id = $1 FOR UPDATE`,
          [propuestaId],
        );
        if (propRes.rowCount === 0) {
          await client.query("ROLLBACK");
          res.status(404).json({ error: "Propuesta no encontrada" });
          return;
        }
        if (propRes.rows[0].estado_buzon !== "pendiente") {
          await client.query("ROLLBACK");
          res.status(409).json({
            error: "La propuesta no está disponible (debe estar en estado 'pendiente')",
            estado_buzon: propRes.rows[0].estado_buzon,
          });
          return;
        }
        propTitulo = String(propRes.rows[0].denominacion ?? "").trim() || null;
        propDescripcion = descripcionPropuestaParaOrdenDia({
          descripcion: propRes.rows[0].descripcion as string | null,
          decisionSolicitada: propRes.rows[0].decision_solicitada as string | null,
        });
        propAntecedentes = (propRes.rows[0].antecedentes as string | null) ?? null;
        propAntecedentesUrl = (propRes.rows[0].antecedentes_url as string | null) ?? null;
        propAntecedentesFilename =
          (propRes.rows[0].antecedentes_filename as string | null) ?? null;
      }

      // Calcular siguiente `orden` si no se especifica.
      let orden = ordenManual ?? 0;
      if (ordenManual == null) {
        const maxRes = await client.query(
          "SELECT COALESCE(MAX(orden), -1) AS max_orden FROM db_convocatoria_puntos WHERE convocatoria_id = $1",
          [id],
        );
        orden = Number(maxRes.rows[0].max_orden) + 1;
      }

      const insertRes = await client.query(
        `INSERT INTO db_convocatoria_puntos
           (convocatoria_id, orden, propuesta_id, titulo, descripcion, notas,
            antecedentes, antecedentes_url, antecedentes_filename)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          id,
          orden,
          propuestaId,
          propuestaId != null ? (titulo.length > 0 ? titulo : propTitulo) : titulo,
          propuestaId != null ? propDescripcion : descripcion,
          notas,
          propAntecedentes,
          propAntecedentesUrl,
          propAntecedentesFilename,
        ],
      );

      if (propuestaId != null) {
        await client.query(
          `UPDATE db_propuestas_junta
              SET estado_buzon = 'en_orden_dia',
                  junta_id = $1,
                  actualizado_en = now()
            WHERE id = $2`,
          [id, propuestaId],
        );
      }

      await client.query(
        "UPDATE db_convocatorias SET actualizado_en = now() WHERE id = $1",
        [id],
      );

      await client.query("COMMIT");
      res.status(201).json({ ok: true, punto: insertRes.rows[0] });
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {
        //
      }
      const msg = String((err as Error)?.message ?? err);
      if (msg.includes("db_convocatoria_puntos_propuesta_uq")) {
        res.status(409).json({
          error: "Esta propuesta ya está en el orden del día de una convocatoria",
          detalle: msg,
        });
        return;
      }
      console.error("[POST /admin/convocatorias/:id/puntos]", err);
      res.status(500).json({ error: "Error añadiendo punto", detalle: msg });
    } finally {
      client.release();
    }
  },
);

/** Editar un punto del orden del día (título/descripción/notas/orden de un punto libre o notas de uno ligado). */
router.put(
  "/admin/convocatorias/:id/puntos/:puntoId",
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
    try {
      const [conv] = await db
        .select()
        .from(convocatoriasTable)
        .where(eq(convocatoriasTable.id, id))
        .limit(1);
      if (!conv) {
        res.status(404).json({ error: "Convocatoria no encontrada" });
        return;
      }
      if (conv.estado === "celebrada") {
        res.status(409).json({ error: "No se pueden editar puntos de una convocatoria celebrada" });
        return;
      }
      const [punto] = await db
        .select()
        .from(convocatoriaPuntosTable)
        .where(
          and(
            eq(convocatoriaPuntosTable.id, puntoId),
            eq(convocatoriaPuntosTable.convocatoriaId, id),
          ),
        )
        .limit(1);
      if (!punto) {
        res.status(404).json({ error: "Punto no encontrado" });
        return;
      }
      const patch: Partial<typeof convocatoriaPuntosTable.$inferInsert> = {};
      if (body.titulo !== undefined) {
        const v = String(body.titulo ?? "").trim();
        if (punto.propuestaId == null && v.length < 2) {
          res.status(400).json({ error: "El título del punto libre es obligatorio" });
          return;
        }
        patch.titulo = v.length > 0 ? v : null;
      }
      if (body.descripcion !== undefined) {
        const v = String(body.descripcion ?? "").trim();
        patch.descripcion = v.length > 0 ? v : null;
      }
      if (body.notas !== undefined) {
        const v = String(body.notas ?? "").trim();
        patch.notas = v.length > 0 ? v : null;
      }
      if (body.orden !== undefined) {
        const n = parseInt(String(body.orden), 10);
        if (Number.isFinite(n)) patch.orden = n;
      }
      if (Object.keys(patch).length === 0) {
        res.json(mapPunto(punto));
        return;
      }
      await db
        .update(convocatoriaPuntosTable)
        .set(patch)
        .where(eq(convocatoriaPuntosTable.id, puntoId));
      const [updated] = await db
        .select()
        .from(convocatoriaPuntosTable)
        .where(eq(convocatoriaPuntosTable.id, puntoId))
        .limit(1);
      await db
        .update(convocatoriasTable)
        .set({ actualizadoEn: new Date() })
        .where(eq(convocatoriasTable.id, id));
      res.json(mapPunto(updated));
    } catch (err) {
      console.error("[PUT .../puntos/:puntoId]", err);
      res.status(500).json({ error: "Error actualizando punto", detalle: String(err) });
    }
  },
);

/**
 * Quitar un punto del orden del día.
 * Si estaba ligado a una propuesta, ésta vuelve al buzón ('pendiente').
 */
router.delete(
  "/admin/convocatorias/:id/puntos/:puntoId",
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
    const client = await pool.connect();
    try {
      await ensureConvocatoriasSchema();
      await client.query("BEGIN");
      const convRes = await client.query(
        "SELECT estado FROM db_convocatorias WHERE id = $1 FOR UPDATE",
        [id],
      );
      if (convRes.rowCount === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Convocatoria no encontrada" });
        return;
      }
      if (convRes.rows[0].estado === "celebrada") {
        await client.query("ROLLBACK");
        res
          .status(409)
          .json({ error: "No se pueden quitar puntos de una convocatoria celebrada" });
        return;
      }
      const puntoRes = await client.query(
        "SELECT propuesta_id FROM db_convocatoria_puntos WHERE id = $1 AND convocatoria_id = $2 FOR UPDATE",
        [puntoId, id],
      );
      if (puntoRes.rowCount === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Punto no encontrado" });
        return;
      }
      const propuestaId = puntoRes.rows[0].propuesta_id as number | null;
      await client.query(
        "DELETE FROM db_convocatoria_puntos WHERE id = $1 AND convocatoria_id = $2",
        [puntoId, id],
      );
      if (propuestaId != null) {
        await client.query(
          `UPDATE db_propuestas_junta
              SET estado_buzon = 'pendiente', junta_id = NULL, actualizado_en = now()
            WHERE id = $1 AND estado_buzon = 'en_orden_dia'`,
          [propuestaId],
        );
      }
      await client.query(
        "UPDATE db_convocatorias SET actualizado_en = now() WHERE id = $1",
        [id],
      );
      await client.query("COMMIT");
      res.json({ ok: true });
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {
        //
      }
      console.error("[DELETE .../puntos/:puntoId]", err);
      res.status(500).json({ error: "Error quitando punto", detalle: String(err) });
    } finally {
      client.release();
    }
  },
);

/**
 * Reordenar puntos del orden del día.
 * Body: { orden: number[] }  (array de ids en el nuevo orden)
 */
router.post(
  "/admin/convocatorias/:id/reordenar",
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
    const ordenRaw = (req.body ?? {}).orden;
    if (!Array.isArray(ordenRaw)) {
      res.status(400).json({ error: "Se esperaba un array 'orden' con los ids de los puntos" });
      return;
    }
    const ids = ordenRaw.map((v) => parseInt(String(v), 10)).filter((n) => Number.isFinite(n));
    if (ids.length === 0) {
      res.status(400).json({ error: "Array 'orden' vacío" });
      return;
    }
    const client = await pool.connect();
    try {
      await ensureConvocatoriasSchema();
      await client.query("BEGIN");
      const convRes = await client.query(
        "SELECT estado FROM db_convocatorias WHERE id = $1 FOR UPDATE",
        [id],
      );
      if (convRes.rowCount === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Convocatoria no encontrada" });
        return;
      }
      if (convRes.rows[0].estado === "celebrada") {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "No se puede reordenar una convocatoria celebrada" });
        return;
      }
      for (let i = 0; i < ids.length; i++) {
        await client.query(
          "UPDATE db_convocatoria_puntos SET orden = $1 WHERE id = $2 AND convocatoria_id = $3",
          [i, ids[i], id],
        );
      }
      await client.query(
        "UPDATE db_convocatorias SET actualizado_en = now() WHERE id = $1",
        [id],
      );
      await client.query("COMMIT");
      res.json({ ok: true });
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {
        //
      }
      console.error("[POST .../reordenar]", err);
      res.status(500).json({ error: "Error reordenando", detalle: String(err) });
    } finally {
      client.release();
    }
  },
);

/** Publicar la convocatoria (pasar de 'borrador' a 'publicada'). */
router.post(
  "/admin/convocatorias/:id/publicar",
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
      const [row] = await db
        .select()
        .from(convocatoriasTable)
        .where(eq(convocatoriasTable.id, id))
        .limit(1);
      if (!row) {
        res.status(404).json({ error: "Convocatoria no encontrada" });
        return;
      }
      if (row.estado !== "borrador") {
        res
          .status(409)
          .json({ error: "Solo se puede publicar desde 'borrador'", estado: row.estado });
        return;
      }
      const ahora = new Date();
      await db
        .update(convocatoriasTable)
        .set({ estado: "publicada", publicadaEn: ahora, actualizadoEn: ahora })
        .where(eq(convocatoriasTable.id, id));
      const [updated] = await db
        .select()
        .from(convocatoriasTable)
        .where(eq(convocatoriasTable.id, id))
        .limit(1);
      res.json(mapConvocatoria(updated));
    } catch (err) {
      console.error("[POST .../publicar]", err);
      res.status(500).json({ error: "Error publicando convocatoria", detalle: String(err) });
    }
  },
);

/**
 * Marcar la convocatoria como celebrada.
 * No revierte automáticamente el estado del buzón: las propuestas siguen en
 * `en_orden_dia` hasta que la directiva las resuelva (módulo de actas las
 * marcará como `resuelta` cuando exista).
 */
router.post(
  "/admin/convocatorias/:id/celebrar",
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
      const [row] = await db
        .select()
        .from(convocatoriasTable)
        .where(eq(convocatoriasTable.id, id))
        .limit(1);
      if (!row) {
        res.status(404).json({ error: "Convocatoria no encontrada" });
        return;
      }
      if (row.estado === "celebrada") {
        res.status(409).json({ error: "La convocatoria ya está celebrada" });
        return;
      }
      const ahora = new Date();
      await db
        .update(convocatoriasTable)
        .set({ estado: "celebrada", celebradaEn: ahora, actualizadoEn: ahora })
        .where(eq(convocatoriasTable.id, id));
      const [updated] = await db
        .select()
        .from(convocatoriasTable)
        .where(eq(convocatoriasTable.id, id))
        .limit(1);
      res.json(mapConvocatoria(updated));
    } catch (err) {
      console.error("[POST .../celebrar]", err);
      res.status(500).json({ error: "Error", detalle: String(err) });
    }
  },
);

// Helpers Drizzle reservados para uso futuro.
void sql;
void isNull;

export default router;
