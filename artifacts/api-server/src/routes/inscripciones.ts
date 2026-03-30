import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { inscripcionesTable, eventosTable, actividadesTable, sociosTable } from "@workspace/db/schema";
import { requireAuth } from "../middlewares/auth";
import { eq, and, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/inscripciones", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { socioId, tipo } = req.query;

  try {
    const where: ReturnType<typeof and>[] = [];
    if (socioId) where.push(eq(inscripcionesTable.socioId, parseInt(String(socioId), 10)));
    if (tipo) where.push(eq(inscripcionesTable.tipo, String(tipo)));

    const rows = await db.select().from(inscripcionesTable)
      .where(where.length > 0 ? and(...where) : undefined)
      .orderBy(desc(inscripcionesTable.fechaInscripcion));

    res.json({ items: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Error consultando inscripciones", detalle: String(err) });
  }
});

router.post("/inscripciones", requireAuth, async (req, res): Promise<void> => {
  const { socioId, eventoId, actividadId, tipo, paradaBus, subactividad, observaciones } = req.body ?? {};

  if (!tipo || (!eventoId && !actividadId)) {
    res.status(400).json({ error: "Datos incompletos" });
    return;
  }

  try {
    if (tipo === "evento" && eventoId) {
      const evento = await db.select().from(eventosTable).where(eq(eventosTable.id, eventoId)).limit(1);
      if (evento.length > 0 && Number(evento[0].plazasDisponibles) > 0) {
        await db.update(eventosTable)
          .set({ plazasDisponibles: Number(evento[0].plazasDisponibles) - 1, updatedAt: new Date() })
          .where(eq(eventosTable.id, eventoId));
      }
    } else if (tipo === "actividad" && actividadId) {
      const act = await db.select().from(actividadesTable).where(eq(actividadesTable.id, actividadId)).limit(1);
      if (act.length > 0 && Number(act[0].plazasDisponibles) > 0) {
        await db.update(actividadesTable)
          .set({ plazasDisponibles: Number(act[0].plazasDisponibles) - 1, updatedAt: new Date() })
          .where(eq(actividadesTable.id, actividadId));
      }
    }

    const inserted = await db.insert(inscripcionesTable).values({
      socioId: socioId ?? null,
      eventoId: eventoId ?? null,
      actividadId: actividadId ?? null,
      tipo,
      paradaBus: paradaBus ?? null,
      subactividad: subactividad ?? null,
      observaciones: observaciones ?? null,
      estado: "confirmada",
    }).returning();

    res.status(201).json(inserted[0]);
  } catch (err) {
    res.status(500).json({ error: "Error creando inscripción", detalle: String(err) });
  }
});

router.delete("/inscripciones/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  try {
    const existing = await db.select().from(inscripcionesTable).where(eq(inscripcionesTable.id, id)).limit(1);
    if (existing.length === 0) {
      res.status(404).json({ error: "Inscripción no encontrada" });
      return;
    }

    const insc = existing[0];
    if (insc.eventoId) {
      await db.update(eventosTable)
        .set({ plazasDisponibles: Number((await db.select({ p: eventosTable.plazasDisponibles }).from(eventosTable).where(eq(eventosTable.id, insc.eventoId)).limit(1))[0]?.p ?? 0) + 1, updatedAt: new Date() })
        .where(eq(eventosTable.id, insc.eventoId));
    }

    await db.delete(inscripcionesTable).where(eq(inscripcionesTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error cancelando inscripción", detalle: String(err) });
  }
});

export default router;
