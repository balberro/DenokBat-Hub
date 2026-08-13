import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { pagosTable } from "@workspace/db/schema";
import { requireAuth } from "../middlewares/auth";
import { resolveSocioIdForUser } from "../lib/resolver";
import { enqueuePagoToOdoo } from "../lib/enqueue";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/pagos", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { socioId, adminView } = req.query;

  try {
    const resolvedSocioId = await resolveSocioIdForUser(req.user);
    const isAdmin = ["administrador", "contable"].includes(user.role);
    const wantsAdminView = String(adminView ?? "").toLowerCase() === "1" || String(adminView ?? "").toLowerCase() === "true";
    let rows: Array<typeof pagosTable.$inferSelect> = [];
    // Seguridad por defecto: devolver pagos propios aunque el rol sea admin/contable.
    // Solo mostrar "todos" cuando se pida explícitamente adminView=1.
    if (isAdmin && wantsAdminView && !socioId) {
      rows = await db.select().from(pagosTable).orderBy(desc(pagosTable.createdAt));
    } else if (socioId && isAdmin) {
      rows = await db.select().from(pagosTable)
        .where(eq(pagosTable.socioId, parseInt(String(socioId), 10)))
        .orderBy(desc(pagosTable.createdAt));
    } else {
      if (!resolvedSocioId) {
        rows = [];
      } else {
        rows = await db.select().from(pagosTable)
          .where(eq(pagosTable.socioId, resolvedSocioId))
          .orderBy(desc(pagosTable.createdAt));
      }
    }
    res.json({ items: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Error consultando pagos", detalle: String(err) });
  }
});

router.get("/pagos/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const user = req.user!;
  try {
    const rows = await db.select().from(pagosTable).where(eq(pagosTable.id, id)).limit(1);
    if (rows.length === 0) {
      res.status(404).json({ error: "Pago no encontrado" });
      return;
    }
    const pago = rows[0];
    const isAdmin = ["administrador", "contable"].includes(user.role);
    const resolvedSocioId = await resolveSocioIdForUser(req.user);
    if (!isAdmin && (!resolvedSocioId || pago.socioId !== resolvedSocioId)) {
      res.status(403).json({ error: "Sin permiso para consultar este pago" });
      return;
    }
    res.json(pago);
  } catch (err) {
    res.status(500).json({ error: "Error consultando pago", detalle: String(err) });
  }
});

router.put("/pagos/:id/pagar", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const user = req.user!;
  const metodoRaw = String(req.body?.metodo ?? "").trim().toLowerCase();
  const metodo = metodoRaw === "tarjeta" ? "tarjeta" : "transferencia";

  try {
    const rows = await db.select().from(pagosTable).where(eq(pagosTable.id, id)).limit(1);
    if (rows.length === 0) {
      res.status(404).json({ error: "Pago no encontrado" });
      return;
    }
    const pago = rows[0];
    const isAdmin = ["administrador", "contable"].includes(user.role);
    const resolvedSocioId = await resolveSocioIdForUser(req.user);
    if (!isAdmin && (!resolvedSocioId || pago.socioId !== resolvedSocioId)) {
      res.status(403).json({ error: "Sin permiso para actualizar este pago" });
      return;
    }

    await db.update(pagosTable)
      .set({
        estado: "pagado",
        metodo,
        fechaPago: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(pagosTable.id, id));

    // Registro del cobro en Odoo (account.payment) vía cola asíncrona.
    await enqueuePagoToOdoo(id);

    const updated = await db.select().from(pagosTable).where(eq(pagosTable.id, id)).limit(1);
    res.json(updated[0] ?? { ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error registrando el pago", detalle: String(err) });
  }
});

export default router;
