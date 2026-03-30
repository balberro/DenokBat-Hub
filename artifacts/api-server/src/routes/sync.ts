import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import { syncAll, syncSocios, syncEventos, syncActividades, syncPagos } from "../lib/sync";

const router: IRouter = Router();

router.post("/sync", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!["administrador", "contable", "directivo"].includes(user.role)) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }

  const { modelo } = req.body ?? {};
  try {
    if (modelo === "socios") {
      const result = await syncSocios();
      res.json({ resultados: [result] });
    } else if (modelo === "eventos") {
      const result = await syncEventos();
      res.json({ resultados: [result] });
    } else if (modelo === "actividades") {
      const result = await syncActividades();
      res.json({ resultados: [result] });
    } else if (modelo === "pagos") {
      const result = await syncPagos();
      res.json({ resultados: [result] });
    } else {
      const resultados = await syncAll();
      res.json({ resultados });
    }
  } catch (err) {
    res.status(500).json({ error: "Error durante la sincronización", detalle: String(err) });
  }
});

router.get("/sync/status", requireAuth, async (_req, res): Promise<void> => {
  const { db } = await import("@workspace/db");
  const { syncLogTable } = await import("@workspace/db/schema");
  const { desc } = await import("drizzle-orm");

  try {
    const logs = await db.select().from(syncLogTable).orderBy(desc(syncLogTable.createdAt)).limit(20);
    res.json({ logs });
  } catch {
    res.json({ logs: [] });
  }
});

export default router;
