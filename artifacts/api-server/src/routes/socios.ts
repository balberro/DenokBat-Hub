import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sociosTable } from "@workspace/db/schema";
import { requireAuth } from "../middlewares/auth";
import { eq, ilike, or, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/socios", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!["administrador", "directivo", "delegado"].includes(user.role)) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }

  const { page = "1", limit = "20", q } = req.query;
  const pageNum = Math.max(1, parseInt(String(page), 10));
  const limitNum = Math.min(100, parseInt(String(limit), 10));
  const offset = (pageNum - 1) * limitNum;

  try {
    const where = q
      ? or(
          ilike(sociosTable.nombre, `%${q}%`),
          ilike(sociosTable.apellidos, `%${q}%`),
          ilike(sociosTable.email, `%${q}%`),
          ilike(sociosTable.numeroSocio, `%${q}%`)
        )
      : undefined;

    const rows = await db.select().from(sociosTable)
      .where(where)
      .orderBy(desc(sociosTable.createdAt))
      .limit(limitNum)
      .offset(offset);

    const total = rows.length; // simplified count

    res.json({ items: rows, total, page: pageNum, limit: limitNum });
  } catch (err) {
    res.status(500).json({ error: "Error consultando socios", detalle: String(err) });
  }
});

router.get("/socios/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!["administrador", "directivo", "delegado"].includes(user.role)) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }

  const id = parseInt(String(req.params.id), 10);
  try {
    const rows = await db.select().from(sociosTable).where(eq(sociosTable.id, id)).limit(1);
    if (rows.length === 0) {
      res.status(404).json({ error: "Socio no encontrado" });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error consultando socio", detalle: String(err) });
  }
});

router.put("/socios/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!["administrador"].includes(user.role)) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }

  const id = parseInt(String(req.params.id), 10);
  const { nombre, apellidos, email, telefono, direccion, estado, grupoId } = req.body ?? {};

  try {
    await db.update(sociosTable).set({
      ...(nombre && { nombre }),
      ...(apellidos !== undefined && { apellidos }),
      ...(email !== undefined && { email }),
      ...(telefono !== undefined && { telefono }),
      ...(direccion !== undefined && { direccion }),
      ...(estado && { estado }),
      ...(grupoId !== undefined && { grupoId }),
      updatedAt: new Date(),
    }).where(eq(sociosTable.id, id));

    const updated = await db.select().from(sociosTable).where(eq(sociosTable.id, id)).limit(1);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: "Error actualizando socio", detalle: String(err) });
  }
});

export default router;
