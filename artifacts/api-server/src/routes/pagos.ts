import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { pagosTable } from "@workspace/db/schema";
import { requireAuth } from "../middlewares/auth";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/pagos", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { socioId } = req.query;

  try {
    let rows;
    if (["administrador", "contable"].includes(user.role)) {
      rows = await db.select().from(pagosTable).orderBy(desc(pagosTable.createdAt));
    } else if (socioId) {
      rows = await db.select().from(pagosTable)
        .where(eq(pagosTable.socioId, parseInt(String(socioId), 10)))
        .orderBy(desc(pagosTable.createdAt));
    } else {
      rows = [];
    }
    res.json({ items: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Error consultando pagos", detalle: String(err) });
  }
});

router.get("/pagos/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  try {
    const rows = await db.select().from(pagosTable).where(eq(pagosTable.id, id)).limit(1);
    if (rows.length === 0) {
      res.status(404).json({ error: "Pago no encontrado" });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error consultando pago", detalle: String(err) });
  }
});

export default router;
