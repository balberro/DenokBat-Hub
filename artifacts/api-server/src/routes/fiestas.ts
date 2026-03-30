import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { fiestasTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const ALL_FIELDS = [
  "nombre","nombreEu","descripcion","descripcionEu","fecha","lugar","fotoUrl",
  "programa","memoria","menu","bus1","bus2","horaInicio","horaFin","precio",
  "plazasTotal","plazasDisponibles","estado","publicado",
];

// GET /fiestas — lista todas las fiestas públicas (solo publicadas)
router.get("/fiestas", async (req, res): Promise<void> => {
  try {
    const rows = await db.select().from(fiestasTable).orderBy(desc(fiestasTable.fecha));
    res.json({ items: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Error listando fiestas", detalle: String(err) });
  }
});

// GET /fiestas/:id — detalle
router.get("/fiestas/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  try {
    const [row] = await db.select().from(fiestasTable).where(eq(fiestasTable.id, id)).limit(1);
    if (!row) { res.status(404).json({ error: "Fiesta no encontrada" }); return; }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Error obteniendo fiesta", detalle: String(err) });
  }
});

// POST /fiestas — crear
router.post("/fiestas", requireAuth, async (req, res): Promise<void> => {
  const body = req.body ?? {};
  if (!body.nombre) { res.status(400).json({ error: "'nombre' es obligatorio" }); return; }
  try {
    const [inserted] = await db.insert(fiestasTable).values({
      nombre:            body.nombre,
      nombreEu:          body.nombreEu      ?? null,
      descripcion:       body.descripcion   ?? null,
      descripcionEu:     body.descripcionEu ?? null,
      fecha:             body.fecha         ?? null,
      lugar:             body.lugar         ?? null,
      fotoUrl:           body.fotoUrl       ?? null,
      programa:          body.programa      ?? null,
      memoria:           body.memoria       ?? null,
      menu:              body.menu          ?? null,
      bus1:              body.bus1          ?? null,
      bus2:              body.bus2          ?? null,
      horaInicio:        body.horaInicio    ?? null,
      horaFin:           body.horaFin       ?? null,
      precio:            body.precio        ?? "0",
      plazasTotal:       body.plazasTotal   ?? 0,
      plazasDisponibles: body.plazasDisponibles ?? 0,
      estado:            body.estado        ?? "proxima",
      publicado:         body.publicado     ?? false,
    }).returning();
    res.status(201).json(inserted);
  } catch (err) {
    res.status(500).json({ error: "Error creando fiesta", detalle: String(err) });
  }
});

// PUT /fiestas/:id — actualizar
router.put("/fiestas/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  const body = req.body ?? {};
  try {
    const fields: Record<string, unknown> = { updatedAt: new Date() };
    ALL_FIELDS.forEach(k => { if (body[k] !== undefined) fields[k] = body[k] ?? null; });
    await db.update(fiestasTable).set(fields).where(eq(fiestasTable.id, id));
    const [updated] = await db.select().from(fiestasTable).where(eq(fiestasTable.id, id)).limit(1);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Error actualizando fiesta", detalle: String(err) });
  }
});

// DELETE /fiestas/:id
router.delete("/fiestas/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  try {
    await db.delete(fiestasTable).where(eq(fiestasTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error eliminando fiesta", detalle: String(err) });
  }
});

export default router;
