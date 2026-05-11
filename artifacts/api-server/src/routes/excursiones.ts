import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { excursionesTable, excursionesSubactsTable } from "@workspace/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function errorDetail(err: unknown): string {
  const e = err as { message?: string; cause?: { message?: string; code?: string; detail?: string } };
  const parts: string[] = [];
  if (e?.message) parts.push(e.message);
  if (e?.cause?.message) parts.push(e.cause.message);
  if (e?.cause?.detail) parts.push(e.cause.detail);
  if (e?.cause?.code) parts.push(`PGCODE=${e.cause.code}`);
  return parts.join(" | ");
}

function nullIfEmpty(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}

function toOptionalNumber(value: unknown): number | null {
  const normalized = nullIfEmpty(value);
  if (normalized === null) return null;
  const n = Number(normalized);
  return Number.isNaN(n) ? null : n;
}

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
    res.status(500).json({ error: "Error listando excursiones", detalle: errorDetail(err) });
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
    res.status(500).json({ error: "Error obteniendo excursión", detalle: errorDetail(err) });
  }
});

// POST /excursiones — crear
router.post("/excursiones", requireAuth, async (req, res): Promise<void> => {
  const body = req.body ?? {};
  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
  if (!nombre) { res.status(400).json({ error: "'nombre' es obligatorio" }); return; }
  try {
    const plazasTotal = toOptionalNumber(body.plazasTotal) ?? 0;
    const [inserted] = await db.insert(excursionesTable).values({
      nombre,
      nombreEu:            nullIfEmpty(body.nombreEu) as string | null,
      descripcion:         nullIfEmpty(body.descripcion) as string | null,
      descripcionEu:       nullIfEmpty(body.descripcionEu) as string | null,
      destino:             nullIfEmpty(body.destino) as string | null,
      fecha:               nullIfEmpty(body.fecha) as string | null,
      fechaRegreso:        nullIfEmpty(body.fechaRegreso) as string | null,
      fotoUrl:             nullIfEmpty(body.fotoUrl) as string | null,
      precioInscripcion:   nullIfEmpty(body.precioInscripcion) as string | null,
      precioSuplemento:    nullIfEmpty(body.precioSuplemento) as string | null,
      subactsInscripcion:  nullIfEmpty(body.subactsInscripcion) as string | null,
      subactsSuplemento:   nullIfEmpty(body.subactsSuplemento) as string | null,
      fechaFinInscripcion: nullIfEmpty(body.fechaFinInscripcion) as string | null,
      menu:                nullIfEmpty(body.menu) as string | null,
      bus1:                nullIfEmpty(body.bus1) as string | null,
      bus2:                nullIfEmpty(body.bus2) as string | null,
      horaRegreso:         nullIfEmpty(body.horaRegreso) as string | null,
      plazasTotal,
      plazasDisponibles:   plazasTotal,
      estado:              (nullIfEmpty(body.estado) as string | null) ?? "prevista",
      observaciones:       nullIfEmpty(body.observaciones) as string | null,
      memoriaParticipantes: nullIfEmpty(body.memoriaParticipantes) as string | null,
      resumen:             nullIfEmpty(body.resumen) as string | null,
      publicado:           Boolean(body.publicado),
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
    res.status(500).json({ error: "Error creando excursión", detalle: errorDetail(err) });
  }
});

// PUT /excursiones/:id — actualizar
router.put("/excursiones/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  const body = req.body ?? {};
  try {
    const fields: Record<string, unknown> = { updatedAt: new Date() };
    const pick = (k: string) => {
      if (body[k] !== undefined) fields[k] = nullIfEmpty(body[k]);
    };
    ["nombre","nombreEu","descripcion","descripcionEu","destino","fecha","fechaRegreso",
     "fotoUrl","precioInscripcion","precioSuplemento","subactsInscripcion","subactsSuplemento",
     "fechaFinInscripcion","menu","bus1","bus2","horaRegreso","plazasTotal","plazasDisponibles",
     "estado","observaciones","memoriaParticipantes","resumen","publicado"].forEach(pick);

    if (body.plazasTotal !== undefined) fields.plazasTotal = toOptionalNumber(body.plazasTotal) ?? 0;
    if (body.plazasDisponibles !== undefined) fields.plazasDisponibles = toOptionalNumber(body.plazasDisponibles) ?? 0;
    if (body.publicado !== undefined) fields.publicado = Boolean(body.publicado);

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
    res.status(500).json({ error: "Error actualizando excursión", detalle: errorDetail(err) });
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
    res.status(500).json({ error: "Error eliminando excursión", detalle: errorDetail(err) });
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
    res.status(500).json({ error: "Error creando subactividad", detalle: errorDetail(err) });
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
    res.status(500).json({ error: "Error actualizando subactividad", detalle: errorDetail(err) });
  }
});

// DELETE /excursiones/:id/subacts/:subId
router.delete("/excursiones/:id/subacts/:subId", requireAuth, async (req, res): Promise<void> => {
  const subId = parseInt(String(req.params.subId), 10);
  try {
    await db.delete(excursionesSubactsTable).where(eq(excursionesSubactsTable.id, subId));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error eliminando subactividad", detalle: errorDetail(err) });
  }
});

export default router;
