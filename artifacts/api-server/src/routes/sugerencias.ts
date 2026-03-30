import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sugerenciasTable } from "@workspace/db/schema";
import { requireAuth } from "../middlewares/auth";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/sugerencias", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { socioId } = req.query;

  try {
    let rows;
    if (["administrador", "directivo"].includes(user.role)) {
      rows = await db.select().from(sugerenciasTable).orderBy(desc(sugerenciasTable.createdAt));
    } else if (socioId) {
      rows = await db.select().from(sugerenciasTable)
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

router.post("/sugerencias", requireAuth, async (req, res): Promise<void> => {
  const { socioId, categoria, texto } = req.body ?? {};

  if (!texto) {
    res.status(400).json({ error: "El texto es obligatorio" });
    return;
  }

  try {
    const inserted = await db.insert(sugerenciasTable).values({
      socioId: socioId ?? null,
      categoria: categoria ?? null,
      texto,
      estado: "pendiente",
    }).returning();
    res.status(201).json(inserted[0]);
  } catch (err) {
    res.status(500).json({ error: "Error guardando sugerencia", detalle: String(err) });
  }
});

router.put("/sugerencias/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!["administrador", "directivo"].includes(user.role)) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }

  const id = parseInt(String(req.params.id), 10);
  const { estado, respuesta } = req.body ?? {};

  try {
    await db.update(sugerenciasTable).set({
      ...(estado && { estado }),
      ...(respuesta !== undefined && { respuesta, fechaRespuesta: new Date() }),
      updatedAt: new Date(),
    }).where(eq(sugerenciasTable.id, id));

    const updated = await db.select().from(sugerenciasTable).where(eq(sugerenciasTable.id, id)).limit(1);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: "Error actualizando sugerencia", detalle: String(err) });
  }
});

export default router;
