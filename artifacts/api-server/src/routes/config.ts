import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { configTable } from "@workspace/db/schema";
import { requireAuth } from "../middlewares/auth";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/config", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!["administrador"].includes(user.role)) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }

  try {
    const rows = await db.select().from(configTable);
    const config: Record<string, string | null> = {};
    for (const row of rows) {
      config[row.clave] = row.valor ?? null;
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: "Error consultando configuración", detalle: String(err) });
  }
});

router.put("/config/:clave", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!["administrador"].includes(user.role)) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }

  const { clave } = req.params;
  const { valor } = req.body ?? {};

  try {
    await db.update(configTable).set({ valor: String(valor), updatedAt: new Date() })
      .where(eq(configTable.clave, String(clave)));
    res.json({ ok: true, clave, valor });
  } catch (err) {
    res.status(500).json({ error: "Error actualizando configuración", detalle: String(err) });
  }
});

export default router;
