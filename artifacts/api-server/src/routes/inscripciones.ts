import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  inscripcionesTable,
  eventosTable,
  actividadesTable,
  pagosTable,
  fiestasTable,
  sociosTable,
  usersTable,
} from "@workspace/db/schema";
import { requireAuth } from "../middlewares/auth";
import { eq, desc, inArray, or, ilike } from "drizzle-orm";

const router: IRouter = Router();

async function resolveSocioIdForUser(user: Express.Request["user"]): Promise<number | null> {
  if (!user) return null;
  const dbUser = await db.select({
    id: usersTable.id,
    socioId: usersTable.socioId,
    email: usersTable.email,
  })
    .from(usersTable)
    .where(
      or(
        eq(usersTable.odooUid, user.uid),
        eq(usersTable.username, String(user.username ?? "")),
      ),
    )
    .orderBy(desc(usersTable.updatedAt))
    .limit(1);

  const dbUserId = Number(dbUser[0]?.id ?? 0) || null;
  const linkedSocioByUser = Number(dbUser[0]?.socioId ?? 0) || null;
  if (linkedSocioByUser) return linkedSocioByUser;

  if (dbUserId) {
    const byUsuarioId = await db.select({ id: sociosTable.id })
      .from(sociosTable)
      .where(eq(sociosTable.usuarioId, dbUserId))
      .limit(1);
    if (byUsuarioId.length > 0) return byUsuarioId[0].id;
  }

  const byOdooId = await db.select({ id: sociosTable.id })
    .from(sociosTable)
    .where(eq(sociosTable.odooId, user.uid))
    .limit(1);
  if (byOdooId.length > 0) return byOdooId[0].id;

  const candidateEmail = String(user.email ?? dbUser[0]?.email ?? "").trim();
  if (candidateEmail) {
    const byEmail = await db.select({ id: sociosTable.id })
      .from(sociosTable)
      .where(ilike(sociosTable.email, candidateEmail))
      .limit(1);
    if (byEmail.length > 0) return byEmail[0].id;
  }

  return null;
}

// ── GET /inscripciones ────────────────────────────────────────────────────────
// Devuelve las inscripciones del usuario autenticado (o todas si es admin/contable).
// Enriquece el resultado con nombre y fecha del evento/fiesta relacionado.
router.get("/inscripciones", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const isAdmin = ["administrador", "contable"].includes(user.role);
  const wantsAdminView = String(req.query.adminView ?? "").toLowerCase() === "1" || String(req.query.adminView ?? "").toLowerCase() === "true";

  try {
    const resolvedSocioId = await resolveSocioIdForUser(req.user);
    let rows;
    if (isAdmin && wantsAdminView && req.query.socioId) {
      rows = await db.select().from(inscripcionesTable)
        .where(eq(inscripcionesTable.socioId, parseInt(String(req.query.socioId), 10)))
        .orderBy(desc(inscripcionesTable.fechaInscripcion));
    } else if (isAdmin && wantsAdminView && !req.query.socioId) {
      rows = await db.select().from(inscripcionesTable)
        .orderBy(desc(inscripcionesTable.fechaInscripcion));
    } else {
      if (!resolvedSocioId) {
        rows = [];
      } else {
        rows = await db.select().from(inscripcionesTable)
          .where(eq(inscripcionesTable.socioId, resolvedSocioId))
          .orderBy(desc(inscripcionesTable.fechaInscripcion));
      }
    }

    // Enrich with event/fiesta names
    const fiestaIds = rows
      .filter(r => r.tipo === "fiesta" && r.eventoId != null)
      .map(r => r.eventoId!);
    const eventoIds = rows
      .filter(r => r.tipo === "evento" && r.eventoId != null)
      .map(r => r.eventoId!);

    const [fiestas, eventos] = await Promise.all([
      fiestaIds.length > 0
        ? db.select({ id: fiestasTable.id, nombre: fiestasTable.nombre, nombreEu: fiestasTable.nombreEu, fecha: fiestasTable.fecha, precio: fiestasTable.precio })
            .from(fiestasTable).where(inArray(fiestasTable.id, fiestaIds))
        : Promise.resolve([]),
      eventoIds.length > 0
        ? db.select({ id: eventosTable.id, nombre: eventosTable.nombre, nombreEu: eventosTable.nombreEu, fecha: eventosTable.fecha })
            .from(eventosTable).where(inArray(eventosTable.id, eventoIds))
        : Promise.resolve([]),
    ]);

    const fiestaMap = Object.fromEntries(fiestas.map(f => [f.id, f]));
    const eventoMap = Object.fromEntries(eventos.map(e => [e.id, e]));

    const enriched = rows.map(r => {
      if (r.tipo === "fiesta" && r.eventoId && fiestaMap[r.eventoId]) {
        const f = fiestaMap[r.eventoId];
        return { ...r, nombre: f.nombre, nombreEu: f.nombreEu, fecha: f.fecha, precio: f.precio };
      }
      if (r.tipo === "evento" && r.eventoId && eventoMap[r.eventoId]) {
        const e = eventoMap[r.eventoId];
        return { ...r, nombre: e.nombre, nombreEu: e.nombreEu, fecha: e.fecha };
      }
      return r;
    });

    // Attach pending pagos
    const inscIds = rows.map(r => r.id);
    const pagos = inscIds.length > 0
      ? await db.select().from(pagosTable)
          .where(inArray(pagosTable.inscripcionId, inscIds))
      : [];
    const pagosMap: Record<number, typeof pagos[0][]> = {};
    for (const p of pagos) {
      if (p.inscripcionId != null) {
        pagosMap[p.inscripcionId] ??= [];
        pagosMap[p.inscripcionId].push(p);
      }
    }

    const result = enriched.map(r => ({
      ...r,
      pagos: pagosMap[r.id] ?? [],
    }));

    res.json({ items: result, total: result.length });
  } catch (err) {
    res.status(500).json({ error: "Error consultando inscripciones", detalle: String(err) });
  }
});

// ── POST /inscripciones ───────────────────────────────────────────────────────
router.post("/inscripciones", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { eventoId, actividadId, tipo, paradaBus, subactividad, observaciones } = req.body ?? {};
  const isAdmin = ["administrador", "contable"].includes(user.role);
  const resolvedSocioId = await resolveSocioIdForUser(req.user);
  const socioId: number | null = isAdmin
    ? Number(req.body.socioId ?? resolvedSocioId ?? 0) || null
    : resolvedSocioId;

  if (!tipo || (!eventoId && !actividadId) || !socioId) {
    res.status(400).json({ error: "Datos incompletos" });
    return;
  }

  try {
    let precio: number | null = null;
    let nombreFiesta: string | null = null;
    const [socio] = await db.select({ odooId: sociosTable.odooId })
      .from(sociosTable)
      .where(eq(sociosTable.id, socioId))
      .limit(1);
    const canGeneratePago = Number(socio?.odooId ?? 0) > 0;

    if (tipo === "fiesta" && eventoId) {
      const [f] = await db.select().from(fiestasTable).where(eq(fiestasTable.id, eventoId)).limit(1);
      if (!f) { res.status(404).json({ error: "Fiesta no encontrada" }); return; }
      if (Number(f.plazasDisponibles) > 0) {
        await db.update(fiestasTable)
          .set({ plazasDisponibles: Number(f.plazasDisponibles) - 1, updatedAt: new Date() })
          .where(eq(fiestasTable.id, eventoId));
      }
      precio = Number(f.precio ?? 0);
      nombreFiesta = f.nombre;

    } else if (tipo === "evento" && eventoId) {
      const [e] = await db.select().from(eventosTable).where(eq(eventosTable.id, eventoId)).limit(1);
      if (e && Number(e.plazasDisponibles) > 0) {
        await db.update(eventosTable)
          .set({ plazasDisponibles: Number(e.plazasDisponibles) - 1, updatedAt: new Date() })
          .where(eq(eventosTable.id, eventoId));
      }
    } else if (tipo === "actividad" && actividadId) {
      const [a] = await db.select().from(actividadesTable).where(eq(actividadesTable.id, actividadId)).limit(1);
      if (a && Number(a.plazasDisponibles) > 0) {
        await db.update(actividadesTable)
          .set({ plazasDisponibles: Number(a.plazasDisponibles) - 1, updatedAt: new Date() })
          .where(eq(actividadesTable.id, actividadId));
      }
    }

    const [inserted] = await db.insert(inscripcionesTable).values({
      socioId,
      eventoId: eventoId ?? null,
      actividadId: actividadId ?? null,
      tipo,
      paradaBus: paradaBus ?? null,
      subactividad: subactividad ?? null,
      observaciones: observaciones ?? null,
      estado: "confirmada",
    }).returning();

    // Solo se genera pago si el socio existe en Odoo.
    let pago = null;
    if (canGeneratePago && precio && precio > 0 && nombreFiesta) {
      const [p] = await db.insert(pagosTable).values({
        socioId,
        inscripcionId: inserted.id,
        concepto: `Inscripción fiesta: ${nombreFiesta}`,
        importe: String(precio),
        metodo: "efectivo",
        estado: "pendiente",
      }).returning();
      pago = p;
    }

    res.status(201).json({ ...inserted, pagos: pago ? [pago] : [] });
  } catch (err) {
    res.status(500).json({ error: "Error creando inscripción", detalle: String(err) });
  }
});

// ── DELETE /inscripciones/:id ─────────────────────────────────────────────────
router.delete("/inscripciones/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const id = parseInt(String(req.params.id), 10);

  try {
    const [insc] = await db.select().from(inscripcionesTable).where(eq(inscripcionesTable.id, id)).limit(1);
    if (!insc) { res.status(404).json({ error: "Inscripción no encontrada" }); return; }

    // Only owner or admin can cancel
    const isAdmin = ["administrador", "contable"].includes(user.role);
    const resolvedSocioId = await resolveSocioIdForUser(req.user);
    if (!isAdmin && (!resolvedSocioId || insc.socioId !== resolvedSocioId)) {
      res.status(403).json({ error: "Sin permiso para cancelar esta inscripción" });
      return;
    }

    // Restore plazas
    if (insc.tipo === "fiesta" && insc.eventoId) {
      const [f] = await db.select({ p: fiestasTable.plazasDisponibles }).from(fiestasTable)
        .where(eq(fiestasTable.id, insc.eventoId)).limit(1);
      if (f) {
        await db.update(fiestasTable)
          .set({ plazasDisponibles: Number(f.p ?? 0) + 1, updatedAt: new Date() })
          .where(eq(fiestasTable.id, insc.eventoId));
      }
    } else if (insc.tipo === "evento" && insc.eventoId) {
      const [e] = await db.select({ p: eventosTable.plazasDisponibles }).from(eventosTable)
        .where(eq(eventosTable.id, insc.eventoId)).limit(1);
      if (e) {
        await db.update(eventosTable)
          .set({ plazasDisponibles: Number(e.p ?? 0) + 1, updatedAt: new Date() })
          .where(eq(eventosTable.id, insc.eventoId));
      }
    }

    // Delete associated pagos first (FK constraint prevents deleting inscription while pagos exist)
    await db.delete(pagosTable).where(eq(pagosTable.inscripcionId, id));

    await db.delete(inscripcionesTable).where(eq(inscripcionesTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error cancelando inscripción", detalle: String(err) });
  }
});

export default router;
