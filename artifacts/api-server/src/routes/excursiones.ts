import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { excursionesTable, excursionesSubactsTable } from "@workspace/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

async function fetchSubacts(excursionId: number) {
  return db.select().from(excursionesSubactsTable)
    .where(eq(excursionesSubactsTable.excursionId, excursionId))
    .orderBy(asc(excursionesSubactsTable.orden));
}

// GET /excursiones — lista
router.get("/excursiones", async (req, res): Promise<void> => {
  const { estado } = req.query;
  try {
    const rows = estado
      ? await db.select().from(excursionesTable).where(eq(excursionesTable.estado, String(estado))).orderBy(desc(excursionesTable.fecha))
      : await db.select().from(excursionesTable).orderBy(desc(excursionesTable.fecha));
    res.json({ items: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Error listando excursiones", detalle: String(err) });
  }
});

// GET /excursiones/:id — detalle con subactividades
router.get("/excursiones/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  try {
    const [row] = await db.select().from(excursionesTable).where(eq(excursionesTable.id, id)).limit(1);
    if (!row) { res.status(404).json({ error: "Excursión no encontrada" }); return; }
    const subacts = await fetchSubacts(id);
    res.json({ ...row, subactividades: subacts });
  } catch (err) {
    res.status(500).json({ error: "Error obteniendo excursión", detalle: String(err) });
  }
});

// POST /excursiones — crear
router.post("/excursiones", requireAuth, async (req, res): Promise<void> => {
  const body = req.body ?? {};
  if (!body.nombre) { res.status(400).json({ error: "'nombre' es obligatorio" }); return; }
  try {
    const [inserted] = await db.insert(excursionesTable).values({
      nombre:              body.nombre,
      nombreEu:            body.nombreEu            ?? null,
      descripcion:         body.descripcion         ?? null,
      descripcionEu:       body.descripcionEu       ?? null,
      destino:             body.destino             ?? null,
      fecha:               body.fecha               ?? null,
      fechaRegreso:        body.fechaRegreso        ?? null,
      fotoUrl:             body.fotoUrl             ?? null,
      precioInscripcion:   body.precioInscripcion   ?? null,
      precioSuplemento:    body.precioSuplemento    ?? null,
      subactsInscripcion:  body.subactsInscripcion  ?? null,
      subactsSuplemento:   body.subactsSuplemento   ?? null,
      fechaFinInscripcion: body.fechaFinInscripcion ?? null,
      menu:                body.menu                ?? null,
      bus1:                body.bus1                ?? null,
      bus2:                body.bus2                ?? null,
      horaRegreso:         body.horaRegreso         ?? null,
      plazasTotal:         body.plazasTotal         ?? 0,
      plazasDisponibles:   body.plazasTotal         ?? 0,
      estado:              body.estado              ?? "prevista",
      observaciones:       body.observaciones       ?? null,
      memoriaParticipantes: body.memoriaParticipantes ?? null,
      resumen:             body.resumen             ?? null,
      publicado:           body.publicado           ?? false,
    }).returning();

    // Subactividades opcionales
    if (Array.isArray(body.subactividades)) {
      const subs = body.subactividades.filter((s: Record<string, unknown>) => s.nombre);
      if (subs.length > 0) {
        await db.insert(excursionesSubactsTable).values(
          subs.map((s: Record<string, unknown>, i: number) => ({
            excursionId: inserted.id,
            orden:       Number(s.orden ?? i + 1),
            nombre:      String(s.nombre ?? ""),
            nombreEu:    s.nombreEu ? String(s.nombreEu) : null,
            fotoUrl:     s.fotoUrl  ? String(s.fotoUrl)  : null,
            memoria:     s.memoria  ? String(s.memoria)  : null,
          }))
        );
      }
    }
    res.status(201).json(inserted);
  } catch (err) {
    res.status(500).json({ error: "Error creando excursión", detalle: String(err) });
  }
});

// PUT /excursiones/:id — actualizar
router.put("/excursiones/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  const body = req.body ?? {};
  try {
    const fields: Record<string, unknown> = { updatedAt: new Date() };
    const pick = (k: string) => { if (body[k] !== undefined) fields[k] = body[k] ?? null; };
    ["nombre","nombreEu","descripcion","descripcionEu","destino","fecha","fechaRegreso",
     "fotoUrl","precioInscripcion","precioSuplemento","subactsInscripcion","subactsSuplemento",
     "fechaFinInscripcion","menu","bus1","bus2","horaRegreso","plazasTotal","plazasDisponibles",
     "estado","observaciones","memoriaParticipantes","resumen","publicado"].forEach(pick);

    await db.update(excursionesTable).set(fields).where(eq(excursionesTable.id, id));

    // Reemplazar subactividades si se envían
    if (Array.isArray(body.subactividades)) {
      await db.delete(excursionesSubactsTable).where(eq(excursionesSubactsTable.excursionId, id));
      const subs = body.subactividades.filter((s: Record<string, unknown>) => s.nombre);
      if (subs.length > 0) {
        await db.insert(excursionesSubactsTable).values(
          subs.map((s: Record<string, unknown>, i: number) => ({
            excursionId: id,
            orden:       Number(s.orden ?? i + 1),
            nombre:      String(s.nombre ?? ""),
            nombreEu:    s.nombreEu ? String(s.nombreEu) : null,
            fotoUrl:     s.fotoUrl  ? String(s.fotoUrl)  : null,
            memoria:     s.memoria  ? String(s.memoria)  : null,
          }))
        );
      }
    }

    const [updated] = await db.select().from(excursionesTable).where(eq(excursionesTable.id, id)).limit(1);
    const subacts = await fetchSubacts(id);
    res.json({ ...updated, subactividades: subacts });
  } catch (err) {
    res.status(500).json({ error: "Error actualizando excursión", detalle: String(err) });
  }
});

// DELETE /excursiones/:id
router.delete("/excursiones/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  try {
    await db.delete(excursionesTable).where(eq(excursionesTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error eliminando excursión", detalle: String(err) });
  }
});

// ─── Subactividades individuales ──────────────────────────────────────────────

// POST /excursiones/:id/subacts
router.post("/excursiones/:id/subacts", requireAuth, async (req, res): Promise<void> => {
  const excursionId = parseInt(String(req.params.id), 10);
  const { orden = 1, nombre, nombreEu, fotoUrl, memoria } = req.body ?? {};
  try {
    const [inserted] = await db.insert(excursionesSubactsTable)
      .values({ excursionId, orden, nombre, nombreEu, fotoUrl, memoria }).returning();
    res.status(201).json(inserted);
  } catch (err) {
    res.status(500).json({ error: "Error creando subactividad", detalle: String(err) });
  }
});

// PUT /excursiones/:id/subacts/:subId
router.put("/excursiones/:id/subacts/:subId", requireAuth, async (req, res): Promise<void> => {
  const subId = parseInt(String(req.params.subId), 10);
  const { orden, nombre, nombreEu, fotoUrl, memoria } = req.body ?? {};
  try {
    const fields: Record<string, unknown> = { updatedAt: new Date() };
    if (orden    !== undefined) fields.orden    = orden;
    if (nombre   !== undefined) fields.nombre   = nombre;
    if (nombreEu !== undefined) fields.nombreEu = nombreEu;
    if (fotoUrl  !== undefined) fields.fotoUrl  = fotoUrl;
    if (memoria  !== undefined) fields.memoria  = memoria;
    await db.update(excursionesSubactsTable).set(fields).where(eq(excursionesSubactsTable.id, subId));
    const [updated] = await db.select().from(excursionesSubactsTable).where(eq(excursionesSubactsTable.id, subId)).limit(1);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Error actualizando subactividad", detalle: String(err) });
  }
});

// DELETE /excursiones/:id/subacts/:subId
router.delete("/excursiones/:id/subacts/:subId", requireAuth, async (req, res): Promise<void> => {
  const subId = parseInt(String(req.params.subId), 10);
  try {
    await db.delete(excursionesSubactsTable).where(eq(excursionesSubactsTable.id, subId));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error eliminando subactividad", detalle: String(err) });
  }
});

export default router;
