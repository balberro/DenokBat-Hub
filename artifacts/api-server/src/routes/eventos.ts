import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { eventosTable } from "@workspace/db/schema";
import { eq, gte, desc } from "drizzle-orm";
import { odooCall } from "../lib/odoo";

const router: IRouter = Router();

const MOCK_EVENTOS = [
  { id: 1, nombre: "Fiesta de Primavera", nombreEu: "Udaberriko Jaia", descripcion: "Gran celebración anual de primavera con música y baile tradicional", descripcionEu: "Udaberriko ospakizun handia musika eta dantza tradizionalarekin", fechaInicio: "2026-04-15T10:00:00", fechaFin: "2026-04-15T20:00:00", lugar: "Plaza Mayor", imagen: null, plazasDisponibles: 200, inscrito: false },
  { id: 2, nombre: "Excursión a Donostia", nombreEu: "Donostiako Irteera", descripcion: "Visita cultural a San Sebastián con visita al museo", descripcionEu: "Kulturaldia San Sebastianen museora bisita eginez", fechaInicio: "2026-05-10T08:00:00", fechaFin: "2026-05-10T20:00:00", lugar: "Autobús desde sede", imagen: null, plazasDisponibles: 45, inscrito: false },
  { id: 3, nombre: "Conferencia: Salud y Bienestar", nombreEu: "Hitzaldia: Osasuna eta Ongizatea", descripcion: "Charla con expertos en medicina y nutrición para mayores", descripcionEu: "Adinekoentzako medikuntza eta nutrizioan adituak", fechaInicio: "2026-04-28T16:00:00", fechaFin: "2026-04-28T18:00:00", lugar: "Sala de actos, sede central", imagen: null, plazasDisponibles: 80, inscrito: false },
  { id: 4, nombre: "Taller de Tecnología", nombreEu: "Teknologia Tailerra", descripcion: "Aprende a usar smartphone y aplicaciones útiles", descripcionEu: "Ikasi telefono adimenduna eta aplikazio erabilgarriak erabiltzen", fechaInicio: "2026-05-05T10:00:00", fechaFin: "2026-05-05T12:00:00", lugar: "Aula informática", imagen: null, plazasDisponibles: 15, inscrito: false },
  { id: 5, nombre: "Almuerzo de Hermandad", nombreEu: "Anaiarteko Bazkaria", descripcion: "Encuentro anual de todos los socios con comida tradicional vasca", descripcionEu: "Bazkide guztien urteko topaketa euskal janari tradizionalarekin", fechaInicio: "2026-06-20T13:00:00", fechaFin: "2026-06-20T17:00:00", lugar: "Restaurante Kaia", imagen: null, plazasDisponibles: 120, inscrito: false },
];

router.get("/eventos", async (req, res): Promise<void> => {
  const { page = "1", limit = "10" } = req.query;
  const pageNum = parseInt(String(page), 10);
  const limitNum = parseInt(String(limit), 10);
  const offset = (pageNum - 1) * limitNum;

  // 1. Try local DB first
  try {
    const rows = await db.select().from(eventosTable)
      .orderBy(desc(eventosTable.fechaInicio))
      .limit(limitNum)
      .offset(offset);

    if (rows.length > 0) {
      const items = rows.map((e) => ({
        id: e.id,
        nombre: e.nombre,
        nombreEu: e.nombreEu,
        descripcion: e.descripcion,
        descripcionEu: e.descripcionEu,
        fechaInicio: e.fechaInicio?.toISOString() ?? "",
        fechaFin: e.fechaFin?.toISOString() ?? null,
        lugar: e.lugar,
        imagen: e.fotoUrl,
        plazasDisponibles: e.plazasDisponibles ?? 0,
        precio: e.precio,
        estado: e.estado,
        inscrito: false,
      }));
      res.json({ items, total: items.length, page: pageNum, limit: limitNum });
      return;
    }
  } catch {
    // DB not available, continue
  }

  // 2. Try Odoo directly
  try {
    const today = new Date().toISOString().split("T")[0];
    const odooEvents = (await odooCall("event.event", "search_read", [
      [["date_begin", ">=", today]],
    ], {
      fields: ["name", "description", "date_begin", "date_end", "address_id", "seats_available", "seats_max"],
      limit: limitNum,
      offset,
      order: "date_begin asc",
    })) as Record<string, unknown>[];

    if (odooEvents && Array.isArray(odooEvents) && odooEvents.length > 0) {
      const items = odooEvents.map((e) => ({
        id: Number(e.id),
        nombre: String(e.name ?? ""),
        nombreEu: null,
        descripcion: e.description ? String(e.description) : null,
        descripcionEu: null,
        fechaInicio: String(e.date_begin ?? ""),
        fechaFin: e.date_end ? String(e.date_end) : null,
        lugar: e.address_id ? String((e.address_id as unknown[])[1] ?? "") : null,
        imagen: null,
        plazasDisponibles: Number(e.seats_available ?? 0),
        inscrito: false,
      }));
      res.json({ items, total: items.length, page: pageNum, limit: limitNum });
      return;
    }
  } catch {
    // Usar mock
  }

  // 3. Mock fallback
  const start = (pageNum - 1) * limitNum;
  const paginated = MOCK_EVENTOS.slice(start, start + limitNum);
  res.json({ items: paginated, total: MOCK_EVENTOS.length, page: pageNum, limit: limitNum });
});

router.get("/eventos/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  try {
    const rows = await db.select().from(eventosTable).where(eq(eventosTable.id, id)).limit(1);
    if (rows.length > 0) {
      const e = rows[0];
      res.json({
        id: e.id,
        nombre: e.nombre,
        nombreEu: e.nombreEu,
        descripcion: e.descripcion,
        descripcionEu: e.descripcionEu,
        fechaInicio: e.fechaInicio?.toISOString() ?? "",
        fechaFin: e.fechaFin?.toISOString() ?? null,
        lugar: e.lugar,
        imagen: e.fotoUrl,
        plazasDisponibles: e.plazasDisponibles ?? 0,
        precio: e.precio,
        estado: e.estado,
        inscrito: false,
      });
      return;
    }
  } catch {
    // continue
  }

  const found = MOCK_EVENTOS.find((e) => e.id === id);
  if (!found) {
    res.status(404).json({ error: "Evento no encontrado" });
    return;
  }
  res.json(found);
});

router.post("/eventos", async (req, res): Promise<void> => {
  const { nombre, nombreEu, descripcion, descripcionEu, fechaInicio, fechaFin, lugar, plazasTotal, precio } = req.body ?? {};
  if (!nombre || !fechaInicio) {
    res.status(400).json({ error: "nombre y fechaInicio son obligatorios" });
    return;
  }

  try {
    const inserted = await db.insert(eventosTable).values({
      nombre,
      nombreEu: nombreEu ?? null,
      descripcion: descripcion ?? null,
      descripcionEu: descripcionEu ?? null,
      fechaInicio: new Date(fechaInicio),
      fechaFin: fechaFin ? new Date(fechaFin) : null,
      lugar: lugar ?? null,
      plazasTotal: plazasTotal ?? 0,
      plazasDisponibles: plazasTotal ?? 0,
      precio: precio ?? "0",
      estado: "publicado",
    }).returning();
    res.status(201).json(inserted[0]);
  } catch (err) {
    res.status(500).json({ error: "Error creando evento", detalle: String(err) });
  }
});

router.put("/eventos/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const { nombre, nombreEu, descripcion, descripcionEu, fechaInicio, fechaFin, lugar, plazasTotal, plazasDisponibles, precio, estado } = req.body ?? {};

  try {
    await db.update(eventosTable).set({
      ...(nombre && { nombre }),
      ...(nombreEu !== undefined && { nombreEu }),
      ...(descripcion !== undefined && { descripcion }),
      ...(descripcionEu !== undefined && { descripcionEu }),
      ...(fechaInicio && { fechaInicio: new Date(fechaInicio) }),
      ...(fechaFin !== undefined && { fechaFin: fechaFin ? new Date(fechaFin) : null }),
      ...(lugar !== undefined && { lugar }),
      ...(plazasTotal !== undefined && { plazasTotal }),
      ...(plazasDisponibles !== undefined && { plazasDisponibles }),
      ...(precio !== undefined && { precio: String(precio) }),
      ...(estado && { estado }),
      updatedAt: new Date(),
    }).where(eq(eventosTable.id, id));

    const updated = await db.select().from(eventosTable).where(eq(eventosTable.id, id)).limit(1);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: "Error actualizando evento", detalle: String(err) });
  }
});

router.delete("/eventos/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  try {
    await db.delete(eventosTable).where(eq(eventosTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error eliminando evento", detalle: String(err) });
  }
});

export default router;
