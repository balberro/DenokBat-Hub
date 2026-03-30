import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { viajesTable, viajesDiasTable } from "@workspace/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

async function fetchDias(viajeId: number) {
  return db.select().from(viajesDiasTable)
    .where(eq(viajesDiasTable.viajeId, viajeId))
    .orderBy(asc(viajesDiasTable.dia));
}

// GET /viajes — lista
router.get("/viajes", async (req, res): Promise<void> => {
  const { estado } = req.query;
  try {
    const rows = estado
      ? await db.select().from(viajesTable).where(eq(viajesTable.estado, String(estado))).orderBy(desc(viajesTable.fechaInicio))
      : await db.select().from(viajesTable).orderBy(desc(viajesTable.fechaInicio));
    res.json({ items: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Error listando viajes", detalle: String(err) });
  }
});

// GET /viajes/:id — detalle con días
router.get("/viajes/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  try {
    const [row] = await db.select().from(viajesTable).where(eq(viajesTable.id, id)).limit(1);
    if (!row) { res.status(404).json({ error: "Viaje no encontrado" }); return; }
    const dias = await fetchDias(id);
    res.json({ ...row, dias });
  } catch (err) {
    res.status(500).json({ error: "Error obteniendo viaje", detalle: String(err) });
  }
});

// POST /viajes — crear
router.post("/viajes", requireAuth, async (req, res): Promise<void> => {
  const body = req.body ?? {};
  if (!body.nombre) { res.status(400).json({ error: "'nombre' es obligatorio" }); return; }
  try {
    const [inserted] = await db.insert(viajesTable).values({
      nombre:              body.nombre,
      nombreEu:            body.nombreEu            ?? null,
      descripcion:         body.descripcion         ?? null,
      descripcionEu:       body.descripcionEu       ?? null,
      destinos:            body.destinos            ?? null,
      fechaInicio:         body.fechaInicio         ?? null,
      fechaFin:            body.fechaFin            ?? null,
      fotoUrl:             body.fotoUrl             ?? null,
      alojamiento:         body.alojamiento         ?? null,
      itinerario:          body.itinerario          ?? null,
      precioInscripcion:   body.precioInscripcion   ?? null,
      precioSuplemento:    body.precioSuplemento    ?? null,
      fechaFinInscripcion: body.fechaFinInscripcion ?? null,
      bus1:                body.bus1                ?? null,
      bus2:                body.bus2                ?? null,
      plazasTotal:         body.plazasTotal         ?? 0,
      plazasDisponibles:   body.plazasTotal         ?? 0,
      estado:              body.estado              ?? "previsto",
      observaciones:       body.observaciones       ?? null,
      memoriaParticipantes: body.memoriaParticipantes ?? null,
      resumen:             body.resumen             ?? null,
      publicado:           body.publicado           ?? false,
    }).returning();

    // Días opcionales
    if (Array.isArray(body.dias)) {
      const dias = body.dias.filter((d: Record<string, unknown>) => d.titulo);
      if (dias.length > 0) {
        await db.insert(viajesDiasTable).values(
          dias.map((d: Record<string, unknown>, i: number) => ({
            viajeId:     inserted.id,
            dia:         Number(d.dia ?? i + 1),
            titulo:      String(d.titulo ?? ""),
            tituloEu:    d.tituloEu    ? String(d.tituloEu)    : null,
            descripcion: d.descripcion ? String(d.descripcion) : null,
            fotoUrl:     d.fotoUrl     ? String(d.fotoUrl)     : null,
            memoria:     d.memoria     ? String(d.memoria)     : null,
          }))
        );
      }
    }
    res.status(201).json(inserted);
  } catch (err) {
    res.status(500).json({ error: "Error creando viaje", detalle: String(err) });
  }
});

// PUT /viajes/:id — actualizar
router.put("/viajes/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  const body = req.body ?? {};
  try {
    const fields: Record<string, unknown> = { updatedAt: new Date() };
    const pick = (k: string) => { if (body[k] !== undefined) fields[k] = body[k] ?? null; };
    ["nombre","nombreEu","descripcion","descripcionEu","destinos","fechaInicio","fechaFin",
     "fotoUrl","alojamiento","itinerario","precioInscripcion","precioSuplemento",
     "fechaFinInscripcion","bus1","bus2","plazasTotal","plazasDisponibles","estado",
     "observaciones","memoriaParticipantes","resumen","publicado"].forEach(pick);

    await db.update(viajesTable).set(fields).where(eq(viajesTable.id, id));

    if (Array.isArray(body.dias)) {
      await db.delete(viajesDiasTable).where(eq(viajesDiasTable.viajeId, id));
      const dias = body.dias.filter((d: Record<string, unknown>) => d.titulo);
      if (dias.length > 0) {
        await db.insert(viajesDiasTable).values(
          dias.map((d: Record<string, unknown>, i: number) => ({
            viajeId:     id,
            dia:         Number(d.dia ?? i + 1),
            titulo:      String(d.titulo ?? ""),
            tituloEu:    d.tituloEu    ? String(d.tituloEu)    : null,
            descripcion: d.descripcion ? String(d.descripcion) : null,
            fotoUrl:     d.fotoUrl     ? String(d.fotoUrl)     : null,
            memoria:     d.memoria     ? String(d.memoria)     : null,
          }))
        );
      }
    }

    const [updated] = await db.select().from(viajesTable).where(eq(viajesTable.id, id)).limit(1);
    const dias = await fetchDias(id);
    res.json({ ...updated, dias });
  } catch (err) {
    res.status(500).json({ error: "Error actualizando viaje", detalle: String(err) });
  }
});

// DELETE /viajes/:id
router.delete("/viajes/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  try {
    await db.delete(viajesTable).where(eq(viajesTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error eliminando viaje", detalle: String(err) });
  }
});

export default router;
