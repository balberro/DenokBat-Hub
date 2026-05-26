import { Router, type IRouter } from "express";
import { db, pool } from "@workspace/db";
import { sugerenciasTable } from "@workspace/db/schema";
import { requireAuth } from "../middlewares/auth";
import { eq, desc, and, sql, asc, isNull } from "drizzle-orm";
import { odooCall } from "../lib/odoo";
import { persistSugerenciaAdjunto } from "../lib/sugerenciasAdjunto";
import { notifySugerenciaEmail } from "../lib/mailSugerencias";

const router: IRouter = Router();

type SugerenciaRow = typeof sugerenciasTable.$inferSelect;

const ESTADOS = ["nueva", "aportaciones", "presentada", "planificada", "rechazada"] as const;
type EstadoSugerencia = (typeof ESTADOS)[number];

function isEstado(s: string): s is EstadoSugerencia {
  return (ESTADOS as readonly string[]).includes(s);
}

async function ensureSugerenciasSchema(): Promise<void> {
  try {
    await pool.query(`
      CREATE SEQUENCE IF NOT EXISTS db_sugerencias_numero_seq;
    `);
    await pool.query(`
      ALTER TABLE db_sugerencias
        ADD COLUMN IF NOT EXISTS parent_id integer REFERENCES db_sugerencias(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS tema varchar(500),
        ADD COLUMN IF NOT EXISTS observaciones_estado text,
        ADD COLUMN IF NOT EXISTS alias_publicacion varchar(200),
        ADD COLUMN IF NOT EXISTS adjunto_url text,
        ADD COLUMN IF NOT EXISTS numero_sugerencia integer,
        ADD COLUMN IF NOT EXISTS fecha_entrada timestamptz DEFAULT now(),
        ADD COLUMN IF NOT EXISTS expediente_id integer,
        ADD COLUMN IF NOT EXISTS nombre_remitente varchar(255),
        ADD COLUMN IF NOT EXISTS email_remitente varchar(255);
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS db_sugerencias_numero_raiz_idx
        ON db_sugerencias (numero_sugerencia)
        WHERE parent_id IS NULL AND numero_sugerencia IS NOT NULL;
    `);
  } catch (e) {
    console.warn("[ensureSugerenciasSchema]", e);
  }
}

async function columnExists(table: string, col: string): Promise<boolean> {
  const r = await pool.query(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
    ) AS ok`,
    [table, col],
  );
  return Boolean(r.rows[0]?.ok);
}

function mapRow(r: Record<string, unknown>) {
  const v = (camel: string, snake: string) => (r[camel] !== undefined ? r[camel] : r[snake]);
  return {
    id: v("id", "id"),
    parent_id: v("parentId", "parent_id") ?? null,
    socio_id: v("socioId", "socio_id") ?? null,
    categoria: v("categoria", "categoria") ?? null,
    tema: v("tema", "tema") ?? null,
    texto: v("texto", "texto"),
    estado: v("estado", "estado"),
    observaciones_estado: v("observacionesEstado", "observaciones_estado") ?? null,
    respuesta: v("respuesta", "respuesta") ?? null,
    fecha_respuesta: v("fechaRespuesta", "fecha_respuesta") ?? null,
    alias_publicacion: v("aliasPublicacion", "alias_publicacion") ?? null,
    adjunto_url: v("adjuntoUrl", "adjunto_url") ?? null,
    numero_sugerencia: v("numeroSugerencia", "numero_sugerencia") ?? null,
    fecha_entrada: v("fechaEntrada", "fecha_entrada") ?? null,
    expediente_id: v("expedienteId", "expediente_id") ?? null,
    nombre_remitente: v("nombreRemitente", "nombre_remitente") ?? null,
    email_remitente: v("emailRemitente", "email_remitente") ?? null,
    created_at: v("createdAt", "created_at") ?? null,
    updated_at: v("updatedAt", "updated_at") ?? null,
  };
}

/** Público: nueva sugerencia raíz (guarda en BD + email + Odoo opcional). */
router.post("/sugerencias", async (req, res): Promise<void> => {
  const body = req.body ?? {};
  const nombre = String(body.nombre ?? "").trim() || null;
  const email = String(body.email ?? "").trim() || null;
  const tema = String(body.tema ?? body.categoria ?? "").trim();
  const mensaje = String(body.mensaje ?? body.texto ?? "").trim();
  const aliasPublicacion = String(body.alias_publicacion ?? body.aliasPublicacion ?? "").trim() || null;
  const adjuntoRaw = body.adjunto ?? body.adjunto_base64 ?? body.archivo;

  if (!tema || tema.length < 2) {
    res.status(400).json({ error: "El tema es obligatorio (mínimo 2 caracteres)." });
    return;
  }
  if (!mensaje || mensaje.length < 4) {
    res.status(400).json({ error: "El mensaje es obligatorio." });
    return;
  }

  try {
    await ensureSugerenciasSchema();
    if (!(await columnExists("db_sugerencias", "numero_sugerencia"))) {
      res.status(503).json({
        error: "Base de datos sin migración de sugerencias.",
        detalle: "Ejecutar lib/db/fix-db-sugerencias-v2.sql",
      });
      return;
    }

    const adjuntoUrl = await persistSugerenciaAdjunto(adjuntoRaw);

    const [inserted] = await db
      .insert(sugerenciasTable)
      .values({
        parentId: null,
        socioId: null,
        categoria: null,
        tema,
        texto: mensaje,
        estado: "nueva",
        observacionesEstado: null,
        aliasPublicacion,
        adjuntoUrl,
        numeroSugerencia: sql`nextval('db_sugerencias_numero_seq')::int`,
        nombreRemitente: nombre,
        emailRemitente: email,
      })
      .returning();

    const row = inserted as unknown as Record<string, unknown>;
    const num = Number(row.numeroSugerencia ?? row.numero_sugerencia ?? 0);

    const mailLines = [
      `Nueva sugerencia n.º ${num}`,
      `Tema: ${tema}`,
      aliasPublicacion ? `Alias público: ${aliasPublicacion}` : "",
      nombre ? `Nombre: ${nombre}` : "",
      email ? `Email: ${email}` : "",
      "",
      "Mensaje:",
      mensaje,
      adjuntoUrl ? `\nAdjunto: ${adjuntoUrl}` : "",
    ].filter(Boolean);

    try {
      await notifySugerenciaEmail({
        subject: `[Denok Bat] Nueva sugerencia n.º ${num}: ${tema.slice(0, 80)}`,
        text: mailLines.join("\n"),
        fromEmail: email,
        fromName: nombre ?? aliasPublicacion ?? null,
      });
    } catch (e) {
      console.warn("[sugerencias] email:", e);
    }

    try {
      await odooCall("helpdesk.ticket", "create", [{
        name: `Sugerencia n.º ${num}: ${tema}`,
        partner_name: nombre ?? aliasPublicacion ?? "Anónimo",
        partner_email: email ?? "",
        description: mailLines.join("\n"),
        tag_ids: [],
      }]);
    } catch {
      //
    }

    res.status(201).json({
      ok: true,
      id: row.id,
      numero_sugerencia: num,
      message: "Sugerencia registrada. ¡Gracias!",
    });
  } catch (err) {
    console.error("[POST /sugerencias]", err);
    res.status(500).json({ error: "Error guardando sugerencia", detalle: String(err) });
  }
});

/** Socio autenticado: sugerencia raíz (tema desde categoría legada). */
router.post("/sugerencias/socio", requireAuth, async (req, res): Promise<void> => {
  const body = req.body ?? {};
  const socioId = body.socioId != null ? parseInt(String(body.socioId), 10) : null;
  const categoria = String(body.categoria ?? "").trim();
  const texto = String(body.texto ?? "").trim();

  if (!categoria || !texto) {
    res.status(400).json({ error: "Categoría y texto son obligatorios" });
    return;
  }

  try {
    await ensureSugerenciasSchema();
    if (!(await columnExists("db_sugerencias", "numero_sugerencia"))) {
      res.status(503).json({
        error: "Base de datos sin migración de sugerencias.",
        detalle: "Ejecutar lib/db/fix-db-sugerencias-v2.sql",
      });
      return;
    }

    const [inserted] = await db
      .insert(sugerenciasTable)
      .values({
        parentId: null,
        socioId: Number.isFinite(socioId) ? socioId : null,
        categoria,
        tema: categoria,
        texto,
        estado: "nueva",
        observacionesEstado: null,
        numeroSugerencia: sql`nextval('db_sugerencias_numero_seq')::int`,
      })
      .returning();

    const row = inserted as unknown as Record<string, unknown>;
    const num = Number(row.numeroSugerencia ?? 0);

    try {
      await notifySugerenciaEmail({
        subject: `[Denok Bat] Sugerencia socio n.º ${num}: ${categoria}`,
        text: [`Sugerencia desde área socio (n.º ${num}).`, `Categoría/tema: ${categoria}`, "", texto].join("\n"),
        fromEmail: req.user?.email ?? null,
        fromName: req.user?.name ?? req.user?.username ?? null,
      });
    } catch (e) {
      console.warn("[sugerencias/socio] email:", e);
    }

    res.status(201).json(inserted);
  } catch (err) {
    console.error("[POST /sugerencias/socio]", err);
    res.status(500).json({ error: "Error guardando sugerencia", detalle: String(err) });
  }
});

/** Público: listado de sugerencias abiertas a aportaciones. */
router.get("/sugerencias/aportaciones-lista", async (_req, res): Promise<void> => {
  try {
    await ensureSugerenciasSchema();
    if (!(await columnExists("db_sugerencias", "estado"))) {
      res.json({ items: [] });
      return;
    }
    const rows = await db
      .select({
        id: sugerenciasTable.id,
        numeroSugerencia: sugerenciasTable.numeroSugerencia,
        tema: sugerenciasTable.tema,
        fechaEntrada: sugerenciasTable.fechaEntrada,
        texto: sugerenciasTable.texto,
      })
      .from(sugerenciasTable)
      .where(and(isNull(sugerenciasTable.parentId), eq(sugerenciasTable.estado, "aportaciones")))
      .orderBy(desc(sugerenciasTable.fechaEntrada));

    res.json({
      items: rows.map((r: { id: number; numeroSugerencia: number | null; tema: string | null; fechaEntrada: Date | null; texto: string }) => ({
        id: r.id,
        numero_sugerencia: r.numeroSugerencia,
        tema: r.tema ?? "",
        fecha_entrada: r.fechaEntrada,
        excerpt: (r.texto ?? "").slice(0, 220),
      })),
    });
  } catch (err) {
    console.error("[GET /sugerencias/aportaciones-lista]", err);
    res.status(500).json({ error: "Error", detalle: String(err) });
  }
});

/** Público: detalle sugerencia por número (solo raíz) + aportaciones. */
router.get("/sugerencias/publico/:numero", async (req, res): Promise<void> => {
  const numero = parseInt(String(req.params.numero), 10);
  if (!Number.isFinite(numero) || numero < 1) {
    res.status(400).json({ error: "Número no válido" });
    return;
  }
  try {
    await ensureSugerenciasSchema();
    const [root] = await db
      .select()
      .from(sugerenciasTable)
      .where(and(isNull(sugerenciasTable.parentId), eq(sugerenciasTable.numeroSugerencia, numero)))
      .limit(1);

    if (!root) {
      res.status(404).json({ error: "Sugerencia no encontrada" });
      return;
    }

    const aportaciones = await db
      .select()
      .from(sugerenciasTable)
      .where(eq(sugerenciasTable.parentId, root.id))
      .orderBy(asc(sugerenciasTable.fechaEntrada), asc(sugerenciasTable.id));

    res.json({
      raiz: mapRow(root as unknown as Record<string, unknown>),
      aportaciones: aportaciones.map((a: SugerenciaRow) => mapRow(a as unknown as Record<string, unknown>)),
      puede_aportar: root.estado === "aportaciones",
    });
  } catch (err) {
    console.error("[GET /sugerencias/publico/:numero]", err);
    res.status(500).json({ error: "Error", detalle: String(err) });
  }
});

/** Público: nueva aportación a una sugerencia en estado aportaciones. */
router.post("/sugerencias/publico/:numero/aportacion", async (req, res): Promise<void> => {
  const numero = parseInt(String(req.params.numero), 10);
  if (!Number.isFinite(numero) || numero < 1) {
    res.status(400).json({ error: "Número no válido" });
    return;
  }

  const body = req.body ?? {};
  const nombre = String(body.nombre ?? "").trim() || null;
  const email = String(body.email ?? "").trim() || null;
  const mensaje = String(body.mensaje ?? body.texto ?? "").trim();
  const aliasPublicacion = String(body.alias_publicacion ?? "").trim() || null;
  const adjuntoRaw = body.adjunto ?? body.adjunto_base64;

  if (!mensaje || mensaje.length < 4) {
    res.status(400).json({ error: "El mensaje es obligatorio." });
    return;
  }

  try {
    await ensureSugerenciasSchema();
    const [root] = await db
      .select()
      .from(sugerenciasTable)
      .where(and(isNull(sugerenciasTable.parentId), eq(sugerenciasTable.numeroSugerencia, numero)))
      .limit(1);

    if (!root) {
      res.status(404).json({ error: "Sugerencia no encontrada" });
      return;
    }
    if (root.estado !== "aportaciones") {
      res.status(400).json({ error: "Esta sugerencia no admite aportaciones en este momento." });
      return;
    }

    const temaLinea = `Aportación a sugerencia n.º ${numero}`;
    const adjuntoUrl = await persistSugerenciaAdjunto(adjuntoRaw);

    // Las aportaciones heredan el estado de la sugerencia raíz: actúan como una línea más.
    const estadoHeredado = isEstado(String(root.estado ?? "")) ? String(root.estado) : "aportaciones";

    const [inserted] = await db
      .insert(sugerenciasTable)
      .values({
        parentId: root.id,
        socioId: null,
        categoria: null,
        tema: temaLinea,
        texto: mensaje,
        estado: estadoHeredado,
        observacionesEstado: null,
        aliasPublicacion,
        adjuntoUrl,
        numeroSugerencia: null,
        nombreRemitente: nombre,
        emailRemitente: email,
      })
      .returning();

    const row = inserted as Record<string, unknown>;
    const mailLines = [
      `Nueva aportación a sugerencia n.º ${numero}`,
      temaLinea,
      `Tema original: ${root.tema ?? ""}`,
      aliasPublicacion ? `Alias público: ${aliasPublicacion}` : "",
      nombre ? `Nombre: ${nombre}` : "",
      email ? `Email: ${email}` : "",
      "",
      "Mensaje:",
      mensaje,
      adjuntoUrl ? `\nAdjunto: ${adjuntoUrl}` : "",
    ];

    try {
      await notifySugerenciaEmail({
        subject: `[Denok Bat] Aportación a sugerencia n.º ${numero}`,
        text: mailLines.join("\n"),
        fromEmail: email,
        fromName: nombre ?? aliasPublicacion ?? null,
      });
    } catch (e) {
      console.warn("[aportacion] email:", e);
    }

    res.status(201).json({
      ok: true,
      id: row.id,
      message: "Aportación enviada. ¡Gracias!",
    });
  } catch (err) {
    console.error("[POST aportacion]", err);
    res.status(500).json({ error: "Error guardando aportación", detalle: String(err) });
  }
});

router.get("/sugerencias", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { socioId, estado, raiz } = req.query;

  try {
    await ensureSugerenciasSchema();
    let rows;

    const userRolesAdmin = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role];
    if (userRolesAdmin.includes("directivo")) {
      const conditions = [];
      if (estado && typeof estado === "string" && isEstado(estado)) {
        conditions.push(eq(sugerenciasTable.estado, estado));
      }
      if (raiz === "1" || raiz === "true") {
        conditions.push(isNull(sugerenciasTable.parentId));
      }
      if (conditions.length === 0) {
        rows = await db.select().from(sugerenciasTable).orderBy(desc(sugerenciasTable.updatedAt));
      } else if (conditions.length === 1) {
        rows = await db
          .select()
          .from(sugerenciasTable)
          .where(conditions[0])
          .orderBy(desc(sugerenciasTable.updatedAt));
      } else {
        rows = await db
          .select()
          .from(sugerenciasTable)
          .where(and(...conditions))
          .orderBy(desc(sugerenciasTable.updatedAt));
      }
    } else if (socioId) {
      rows = await db
        .select()
        .from(sugerenciasTable)
        .where(eq(sugerenciasTable.socioId, parseInt(String(socioId), 10)))
        .orderBy(desc(sugerenciasTable.createdAt));
    } else {
      rows = [];
    }
    res.json({ items: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Error consultando sugerencias", detalle: String(err) });
  }
});

/** Directiva: ficha con raíz + aportaciones (id puede ser raíz o hijo). */
router.get("/sugerencias/:id/ficha", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const userRolesFicha = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role];
  if (!userRolesFicha.includes("directivo")) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }

  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id no válido" });
    return;
  }

  try {
    const [row] = await db.select().from(sugerenciasTable).where(eq(sugerenciasTable.id, id)).limit(1);
    if (!row) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }

    let root = row;
    if (row.parentId != null) {
      const [p] = await db.select().from(sugerenciasTable).where(eq(sugerenciasTable.id, row.parentId)).limit(1);
      if (p) root = p;
    }

    const aportaciones = await db
      .select()
      .from(sugerenciasTable)
      .where(eq(sugerenciasTable.parentId, root.id))
      .orderBy(asc(sugerenciasTable.fechaEntrada), asc(sugerenciasTable.id));

    res.json({
      cabecera: mapRow(root as unknown as Record<string, unknown>),
      sugerencia: mapRow(root as unknown as Record<string, unknown>),
      aportaciones: aportaciones.map((a: SugerenciaRow) => mapRow(a as unknown as Record<string, unknown>)),
    });
  } catch (err) {
    res.status(500).json({ error: "Error", detalle: String(err) });
  }
});

router.put("/sugerencias/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const userRolesPut = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role];
  if (!userRolesPut.includes("directivo")) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }

  const id = parseInt(String(req.params.id), 10);
  const body = req.body ?? {};

  try {
    const [prev] = await db.select().from(sugerenciasTable).where(eq(sugerenciasTable.id, id)).limit(1);
    if (!prev) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }

    const estadoRaw = body.estado != null ? String(body.estado).trim() : "";
    const patch: Partial<typeof sugerenciasTable.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (body.tema !== undefined) patch.tema = String(body.tema).trim() || null;
    if (body.texto !== undefined) {
      const t = String(body.texto).trim();
      if (t.length > 0) patch.texto = t;
    }
    if (body.observaciones_estado !== undefined) {
      patch.observacionesEstado = String(body.observaciones_estado ?? "").trim() || null;
    }
    if (body.respuesta !== undefined) {
      patch.respuesta = String(body.respuesta ?? "").trim() || null;
      patch.fechaRespuesta = new Date();
    }
    // Solo la raíz puede fijar estado; las aportaciones lo heredan.
    const esRaiz = prev.parentId == null;
    let propagateEstado: string | null = null;
    // Estados que solo se pueden establecer mediante flujos dedicados:
    //   - `presentada`: vía POST /admin/propuestas-junta/desde-sugerencia.
    //   - `planificada` / `rechazada`: vía resolución de propuesta o acta.
    // Aquí solo se admiten cambios manuales a `nueva` o `aportaciones`.
    const ESTADOS_MANUALES = ["nueva", "aportaciones"];
    if (estadoRaw && isEstado(estadoRaw)) {
      if (esRaiz) {
        if (estadoRaw !== prev.estado && !ESTADOS_MANUALES.includes(estadoRaw)) {
          res.status(409).json({
            error:
              "Ese estado solo se puede establecer mediante su flujo (propuesta a la junta o acta).",
            estado: estadoRaw,
            sugerencia_id: id,
          });
          return;
        }
        patch.estado = estadoRaw;
        if (estadoRaw !== prev.estado) {
          propagateEstado = estadoRaw;
        }
      } else {
        console.info(
          `[sugerencias] PUT estado en aportación ${id} ignorado: las aportaciones heredan el estado de su sugerencia raíz.`,
        );
      }
    }

    await db.update(sugerenciasTable).set(patch).where(eq(sugerenciasTable.id, id));

    if (propagateEstado) {
      await db
        .update(sugerenciasTable)
        .set({ estado: propagateEstado, updatedAt: new Date() })
        .where(eq(sugerenciasTable.parentId, id));
    }

    const [updated] = await db.select().from(sugerenciasTable).where(eq(sugerenciasTable.id, id)).limit(1);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Error actualizando sugerencia", detalle: String(err) });
  }
});

export default router;
