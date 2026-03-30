import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  eventosFullTable,
  eventosSubactsTable,
  eventosMediaTable,
} from "@workspace/db/schema";
import { eq, desc, and, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchSubacts(eventoId: number) {
  return db
    .select()
    .from(eventosSubactsTable)
    .where(eq(eventosSubactsTable.eventoId, eventoId))
    .orderBy(asc(eventosSubactsTable.orden));
}

async function fetchMedia(eventoId: number) {
  return db
    .select()
    .from(eventosMediaTable)
    .where(eq(eventosMediaTable.eventoId, eventoId))
    .orderBy(asc(eventosMediaTable.orden));
}

// ─── GET /eventos-full ─────────────────────────────────────────────────────
// Lista todos los eventos. Filtros opcionales: tipo, estado, publicado
router.get("/eventos-full", async (req, res): Promise<void> => {
  const { tipo, estado, publicado } = req.query;

  try {
    const conditions = [];
    if (tipo)      conditions.push(eq(eventosFullTable.tipo,     String(tipo)));
    if (estado)    conditions.push(eq(eventosFullTable.estado,   String(estado)));
    if (publicado !== undefined)
      conditions.push(eq(eventosFullTable.publicado, publicado === "true"));

    const rows = await db
      .select()
      .from(eventosFullTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(eventosFullTable.fechaInicio));

    res.json({ items: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Error listando eventos", detalle: String(err) });
  }
});

// ─── GET /eventos-full/:id ─────────────────────────────────────────────────
// Devuelve un evento completo con sus subactividades y multimedia
router.get("/eventos-full/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  try {
    const [evento] = await db
      .select()
      .from(eventosFullTable)
      .where(eq(eventosFullTable.id, id))
      .limit(1);

    if (!evento) { res.status(404).json({ error: "Evento no encontrado" }); return; }

    const [subacts, media] = await Promise.all([
      fetchSubacts(id),
      fetchMedia(id),
    ]);

    // Adjuntar media de cada subactividad
    const subactsWithMedia = subacts.map((s) => ({
      ...s,
      media: media.filter((m) => m.subactId === s.id),
    }));

    res.json({
      ...evento,
      subactividades: subactsWithMedia,
      media: media.filter((m) => m.subactId === null),
    });
  } catch (err) {
    res.status(500).json({ error: "Error obteniendo evento", detalle: String(err) });
  }
});

// ─── POST /eventos-full ────────────────────────────────────────────────────
// Crea un evento nuevo (admins/directivos)
router.post("/eventos-full", requireAuth, async (req, res): Promise<void> => {
  const body = req.body ?? {};
  if (!body.nombre) {
    res.status(400).json({ error: "El campo 'nombre' es obligatorio" });
    return;
  }

  try {
    const [inserted] = await db
      .insert(eventosFullTable)
      .values({
        tipo:                  body.tipo               ?? "excursion",
        estado:                body.estado             ?? "prevista",
        nombre:                body.nombre,
        nombreEu:              body.nombreEu            ?? null,
        descripcion:           body.descripcion         ?? null,
        descripcionEu:         body.descripcionEu       ?? null,
        fechaInicio:           body.fechaInicio         ?? null,
        fechaFin:              body.fechaFin            ?? null,
        fechaFinInscripcion:   body.fechaFinInscripcion ?? null,
        precioInscripcion:     body.precioInscripcion   ?? null,
        precioSuplemento:      body.precioSuplemento    ?? null,
        subactsInscripcion:    body.subactsInscripcion  ?? null,
        subactsSuplemento:     body.subactsSuplemento   ?? null,
        lugar:                 body.lugar               ?? null,
        menu:                  body.menu                ?? null,
        bus1:                  body.bus1                ?? null,
        bus2:                  body.bus2                ?? null,
        horaRegreso:           body.horaRegreso         ?? null,
        plazasTotal:           body.plazasTotal         ?? 0,
        plazasDisponibles:     body.plazasDisponibles   ?? body.plazasTotal ?? 0,
        fotoUrl:               body.fotoUrl             ?? null,
        memoriaParticipantes:  body.memoriaParticipantes ?? null,
        resumen:               body.resumen             ?? null,
        extra:                 body.extra               ?? null,
        publicado:             body.publicado           ?? false,
      })
      .returning();

    // Si viene con subactividades, las insertamos
    if (Array.isArray(body.subactividades) && body.subactividades.length > 0) {
      await db.insert(eventosSubactsTable).values(
        body.subactividades.map((s: Record<string, unknown>, i: number) => ({
          eventoId:   inserted.id,
          orden:      (s.orden as number) ?? i + 1,
          nombre:     (s.nombre as string)   ?? null,
          nombreEu:   (s.nombreEu as string) ?? null,
          fotoUrl:    (s.fotoUrl as string)  ?? null,
          memoria:    (s.memoria as string)  ?? null,
        }))
      );
    }

    res.status(201).json(inserted);
  } catch (err) {
    res.status(500).json({ error: "Error creando evento", detalle: String(err) });
  }
});

// ─── PUT /eventos-full/:id ─────────────────────────────────────────────────
// Actualiza un evento completo
router.put("/eventos-full/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const body = req.body ?? {};

  try {
    await db
      .update(eventosFullTable)
      .set({
        ...(body.tipo                !== undefined && { tipo:                 body.tipo }),
        ...(body.estado             !== undefined && { estado:               body.estado }),
        ...(body.nombre             !== undefined && { nombre:               body.nombre }),
        ...(body.nombreEu           !== undefined && { nombreEu:             body.nombreEu }),
        ...(body.descripcion        !== undefined && { descripcion:          body.descripcion }),
        ...(body.descripcionEu      !== undefined && { descripcionEu:        body.descripcionEu }),
        ...(body.fechaInicio        !== undefined && { fechaInicio:          body.fechaInicio }),
        ...(body.fechaFin           !== undefined && { fechaFin:             body.fechaFin }),
        ...(body.fechaFinInscripcion !== undefined && { fechaFinInscripcion: body.fechaFinInscripcion }),
        ...(body.precioInscripcion  !== undefined && { precioInscripcion:    body.precioInscripcion }),
        ...(body.precioSuplemento   !== undefined && { precioSuplemento:     body.precioSuplemento }),
        ...(body.subactsInscripcion !== undefined && { subactsInscripcion:   body.subactsInscripcion }),
        ...(body.subactsSuplemento  !== undefined && { subactsSuplemento:    body.subactsSuplemento }),
        ...(body.lugar              !== undefined && { lugar:                body.lugar }),
        ...(body.menu               !== undefined && { menu:                 body.menu }),
        ...(body.bus1               !== undefined && { bus1:                 body.bus1 }),
        ...(body.bus2               !== undefined && { bus2:                 body.bus2 }),
        ...(body.horaRegreso        !== undefined && { horaRegreso:          body.horaRegreso }),
        ...(body.plazasTotal        !== undefined && { plazasTotal:          body.plazasTotal }),
        ...(body.plazasDisponibles  !== undefined && { plazasDisponibles:    body.plazasDisponibles }),
        ...(body.fotoUrl            !== undefined && { fotoUrl:              body.fotoUrl }),
        ...(body.memoriaParticipantes !== undefined && { memoriaParticipantes: body.memoriaParticipantes }),
        ...(body.resumen            !== undefined && { resumen:              body.resumen }),
        ...(body.extra              !== undefined && { extra:                body.extra }),
        ...(body.publicado          !== undefined && { publicado:            body.publicado }),
        updatedAt: new Date(),
      })
      .where(eq(eventosFullTable.id, id));

    const [updated] = await db
      .select()
      .from(eventosFullTable)
      .where(eq(eventosFullTable.id, id))
      .limit(1);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Error actualizando evento", detalle: String(err) });
  }
});

// ─── DELETE /eventos-full/:id ──────────────────────────────────────────────
router.delete("/eventos-full/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  try {
    // Cascade elimina subacts y media automáticamente (ON DELETE CASCADE)
    await db.delete(eventosFullTable).where(eq(eventosFullTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error eliminando evento", detalle: String(err) });
  }
});

// ─── Subactividades ───────────────────────────────────────────────────────

// GET /eventos-full/:id/subacts
router.get("/eventos-full/:id/subacts", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  try {
    const rows = await fetchSubacts(id);
    res.json({ items: rows });
  } catch (err) {
    res.status(500).json({ error: "Error obteniendo subactividades", detalle: String(err) });
  }
});

// POST /eventos-full/:id/subacts
router.post("/eventos-full/:id/subacts", requireAuth, async (req, res): Promise<void> => {
  const eventoId = parseInt(String(req.params.id), 10);
  const { orden = 1, nombre, nombreEu, fotoUrl, memoria } = req.body ?? {};

  try {
    const [inserted] = await db
      .insert(eventosSubactsTable)
      .values({ eventoId, orden, nombre, nombreEu, fotoUrl, memoria })
      .returning();
    res.status(201).json(inserted);
  } catch (err) {
    res.status(500).json({ error: "Error creando subactividad", detalle: String(err) });
  }
});

// PUT /eventos-full/:id/subacts/:subId
router.put("/eventos-full/:id/subacts/:subId", requireAuth, async (req, res): Promise<void> => {
  const subId = parseInt(String(req.params.subId), 10);
  const { orden, nombre, nombreEu, fotoUrl, memoria } = req.body ?? {};

  try {
    await db
      .update(eventosSubactsTable)
      .set({
        ...(orden    !== undefined && { orden }),
        ...(nombre   !== undefined && { nombre }),
        ...(nombreEu !== undefined && { nombreEu }),
        ...(fotoUrl  !== undefined && { fotoUrl }),
        ...(memoria  !== undefined && { memoria }),
        updatedAt: new Date(),
      })
      .where(eq(eventosSubactsTable.id, subId));

    const [updated] = await db
      .select()
      .from(eventosSubactsTable)
      .where(eq(eventosSubactsTable.id, subId))
      .limit(1);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Error actualizando subactividad", detalle: String(err) });
  }
});

// DELETE /eventos-full/:id/subacts/:subId
router.delete("/eventos-full/:id/subacts/:subId", requireAuth, async (req, res): Promise<void> => {
  const subId = parseInt(String(req.params.subId), 10);
  try {
    await db.delete(eventosSubactsTable).where(eq(eventosSubactsTable.id, subId));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error eliminando subactividad", detalle: String(err) });
  }
});

// ─── Multimedia ───────────────────────────────────────────────────────────

// GET /eventos-full/:id/media
router.get("/eventos-full/:id/media", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  try {
    const rows = await fetchMedia(id);
    res.json({ items: rows });
  } catch (err) {
    res.status(500).json({ error: "Error obteniendo multimedia", detalle: String(err) });
  }
});

// POST /eventos-full/:id/media
router.post("/eventos-full/:id/media", requireAuth, async (req, res): Promise<void> => {
  const eventoId = parseInt(String(req.params.id), 10);
  const { subactId, tipoMedia = "foto", url, nombreArchivo, mimeType, tamanoBytes, orden = 0, descripcion, descripcionEu } = req.body ?? {};

  if (!url) { res.status(400).json({ error: "El campo 'url' es obligatorio" }); return; }

  try {
    const [inserted] = await db
      .insert(eventosMediaTable)
      .values({ eventoId, subactId: subactId ?? null, tipoMedia, url, nombreArchivo, mimeType, tamanoBytes, orden, descripcion, descripcionEu })
      .returning();
    res.status(201).json(inserted);
  } catch (err) {
    res.status(500).json({ error: "Error guardando media", detalle: String(err) });
  }
});

// DELETE /eventos-full/:id/media/:mediaId
router.delete("/eventos-full/:id/media/:mediaId", requireAuth, async (req, res): Promise<void> => {
  const mediaId = parseInt(String(req.params.mediaId), 10);
  try {
    await db.delete(eventosMediaTable).where(eq(eventosMediaTable.id, mediaId));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error eliminando media", detalle: String(err) });
  }
});

export default router;
