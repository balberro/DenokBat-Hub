import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { actividadesTable } from "@workspace/db/schema";
import { eq, ilike } from "drizzle-orm";
import { odooCall } from "../lib/odoo";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const MOCK_ACTIVIDADES = [
  { id: 1, nombre: "Yoga", nombreEu: "Yoga", descripcion: "Clases de yoga para todos los niveles", descripcionEu: "Yoga klaseak maila guztientzat", categoria: "Salud", horario: "Lunes y Miércoles 10:00-11:00", diasSemana: "Lunes, Miércoles", plazasTotal: 20, plazasDisponibles: 8, imagen: null, estado: "disponible", inscrito: false },
  { id: 2, nombre: "Senderismo", nombreEu: "Mendizaletasuna", descripcion: "Rutas por los alrededores del municipio", descripcionEu: "Udalerriko ibilaldiak", categoria: "Deporte", horario: "Sábados 9:00-13:00", diasSemana: "Sábado", plazasTotal: 30, plazasDisponibles: 12, imagen: null, estado: "disponible", inscrito: false },
  { id: 3, nombre: "Informática básica", nombreEu: "Oinarrizko informatika", descripcion: "Aprende a usar el ordenador y el móvil", descripcionEu: "Ordenagailua eta mugikorra erabiltzen ikasi", categoria: "Formación", horario: "Martes y Jueves 16:00-17:30", diasSemana: "Martes, Jueves", plazasTotal: 15, plazasDisponibles: 3, imagen: null, estado: "disponible", inscrito: false },
  { id: 4, nombre: "Pintura", nombreEu: "Margolaritza", descripcion: "Taller de pintura creativa", descripcionEu: "Margolari tailer sortzailea", categoria: "Cultura", horario: "Viernes 10:00-12:00", diasSemana: "Viernes", plazasTotal: 12, plazasDisponibles: 0, imagen: null, estado: "lista_espera", inscrito: false },
  { id: 5, nombre: "Idiomas: Inglés", nombreEu: "Hizkuntzak: Ingelesa", descripcion: "Inglés para principiantes", descripcionEu: "Ingelesa hasiberrientzat", categoria: "Formación", horario: "Lunes y Jueves 11:00-12:00", diasSemana: "Lunes, Jueves", plazasTotal: 15, plazasDisponibles: 5, imagen: null, estado: "disponible", inscrito: false },
  { id: 6, nombre: "Cocina saludable", nombreEu: "Sukalde osasuntsua", descripcion: "Talleres de cocina mediterránea", descripcionEu: "Sukalde mediterraneoaren tailerrak", categoria: "Salud", horario: "Miércoles 17:00-19:00", diasSemana: "Miércoles", plazasTotal: 10, plazasDisponibles: 4, imagen: null, estado: "disponible", inscrito: false },
];

function dbRowToItem(a: typeof actividadesTable.$inferSelect) {
  return {
    id: a.id,
    nombre: a.nombre,
    nombreEu: a.nombreEu,
    descripcion: a.descripcion,
    descripcionEu: a.descripcionEu,
    categoria: a.categoria,
    horario: a.horario,
    diasSemana: null,
    plazasTotal: a.plazasTotal ?? 0,
    plazasDisponibles: a.plazasDisponibles ?? 0,
    imagen: a.fotoUrl,
    precio: a.precio,
    estado: a.estado,
    inscrito: false,
  };
}

router.get("/actividades", async (req, res): Promise<void> => {
  const { categoria, page = "1", limit = "10" } = req.query;
  const pageNum = parseInt(String(page), 10);
  const limitNum = parseInt(String(limit), 10);
  const offset = (pageNum - 1) * limitNum;

  // 1. Local DB first
  try {
    const rows = await db.select().from(actividadesTable)
      .limit(limitNum).offset(offset);

    if (rows.length > 0) {
      let items = rows.map(dbRowToItem);
      if (categoria) {
        items = items.filter((a) => a.categoria?.toLowerCase() === String(categoria).toLowerCase());
      }
      res.json({ items, total: items.length, page: pageNum, limit: limitNum });
      return;
    }
  } catch {
    // continue
  }

  // 2. Odoo fallback
  try {
    const domain: unknown[] = [["active", "=", true]];
    if (categoria) {
      domain.push(["tag_ids.name", "=", categoria]);
    }

    const odooEvents = (await odooCall("event.event", "search_read", [domain], {
      fields: ["name", "description", "date_begin", "date_end", "seats_max", "seats_available"],
      limit: limitNum,
      offset,
    })) as Record<string, unknown>[];

    if (odooEvents && Array.isArray(odooEvents) && odooEvents.length > 0) {
      const items = odooEvents.map((e, i) => ({
        id: Number(e.id ?? i),
        nombre: String(e.name ?? ""),
        nombreEu: null,
        descripcion: String(e.description ?? ""),
        descripcionEu: null,
        categoria: "General",
        horario: e.date_begin ? String(e.date_begin) : null,
        diasSemana: null,
        plazasTotal: Number(e.seats_max ?? 0),
        plazasDisponibles: Number(e.seats_available ?? 0),
        imagen: null,
        estado: Number(e.seats_available ?? 0) > 0 ? "disponible" : "lista_espera",
        inscrito: false,
      }));
      res.json({ items, total: items.length, page: pageNum, limit: limitNum });
      return;
    }
  } catch {
    // Odoo no disponible
  }

  // 3. Mock fallback
  let items = MOCK_ACTIVIDADES;
  if (categoria) {
    items = items.filter((a) => a.categoria.toLowerCase() === String(categoria).toLowerCase());
  }
  const start = (pageNum - 1) * limitNum;
  const paginated = items.slice(start, start + limitNum);
  res.json({ items: paginated, total: items.length, page: pageNum, limit: limitNum });
});

router.get("/actividades/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  try {
    const rows = await db.select().from(actividadesTable).where(eq(actividadesTable.id, id)).limit(1);
    if (rows.length > 0) {
      res.json(dbRowToItem(rows[0]));
      return;
    }
  } catch {
    // continue
  }

  const found = MOCK_ACTIVIDADES.find((a) => a.id === id);
  if (!found) {
    res.status(404).json({ error: "Actividad no encontrada" });
    return;
  }
  res.json(found);
});

router.post("/actividades", requireAuth, async (req, res): Promise<void> => {
  const { nombre, nombreEu, descripcion, descripcionEu, categoria, horario, plazasTotal, precio } = req.body ?? {};
  if (!nombre) {
    res.status(400).json({ error: "nombre es obligatorio" });
    return;
  }

  try {
    const inserted = await db.insert(actividadesTable).values({
      nombre,
      nombreEu: nombreEu ?? null,
      descripcion: descripcion ?? null,
      descripcionEu: descripcionEu ?? null,
      categoria: categoria ?? null,
      horario: horario ?? null,
      plazasTotal: plazasTotal ?? 0,
      plazasDisponibles: plazasTotal ?? 0,
      precio: precio ? String(precio) : "0",
      estado: "disponible",
    }).returning();
    res.status(201).json(dbRowToItem(inserted[0]));
  } catch (err) {
    res.status(500).json({ error: "Error creando actividad", detalle: String(err) });
  }
});

router.put("/actividades/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const { nombre, nombreEu, descripcion, descripcionEu, categoria, horario, plazasTotal, plazasDisponibles, precio, estado } = req.body ?? {};

  try {
    await db.update(actividadesTable).set({
      ...(nombre && { nombre }),
      ...(nombreEu !== undefined && { nombreEu }),
      ...(descripcion !== undefined && { descripcion }),
      ...(descripcionEu !== undefined && { descripcionEu }),
      ...(categoria !== undefined && { categoria }),
      ...(horario !== undefined && { horario }),
      ...(plazasTotal !== undefined && { plazasTotal }),
      ...(plazasDisponibles !== undefined && { plazasDisponibles }),
      ...(precio !== undefined && { precio: String(precio) }),
      ...(estado && { estado }),
      updatedAt: new Date(),
    }).where(eq(actividadesTable.id, id));

    const updated = await db.select().from(actividadesTable).where(eq(actividadesTable.id, id)).limit(1);
    res.json(updated.length > 0 ? dbRowToItem(updated[0]) : { id });
  } catch (err) {
    res.status(500).json({ error: "Error actualizando actividad", detalle: String(err) });
  }
});

router.delete("/actividades/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  try {
    await db.delete(actividadesTable).where(eq(actividadesTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error eliminando actividad", detalle: String(err) });
  }
});

router.post("/actividades/:id/inscribir", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id), 10);

  try {
    const rows = await db.select().from(actividadesTable).where(eq(actividadesTable.id, id)).limit(1);
    if (rows.length === 0) {
      res.status(404).json({ error: "Actividad no encontrada" });
      return;
    }
    const act = rows[0];
    if (Number(act.plazasDisponibles) <= 0) {
      res.status(400).json({ error: "No hay plazas disponibles" });
      return;
    }
    await db.update(actividadesTable)
      .set({ plazasDisponibles: Number(act.plazasDisponibles) - 1, updatedAt: new Date() })
      .where(eq(actividadesTable.id, id));
    res.json({ success: true, message: "Inscripción realizada correctamente", estado: "inscrito" });
    return;
  } catch {
    // continue to mock
  }

  const found = MOCK_ACTIVIDADES.find((a) => a.id === id);
  if (!found) {
    res.status(404).json({ error: "Actividad no encontrada" });
    return;
  }
  if (found.estado === "cerrada") {
    res.status(400).json({ error: "La actividad está cerrada a inscripciones" });
    return;
  }
  res.json({ success: true, message: "Inscripción realizada correctamente", estado: "inscrito" });
});

router.delete("/actividades/:id/inscribir", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id), 10);

  try {
    const rows = await db.select().from(actividadesTable).where(eq(actividadesTable.id, id)).limit(1);
    if (rows.length > 0) {
      await db.update(actividadesTable)
        .set({ plazasDisponibles: Number(rows[0].plazasDisponibles) + 1, updatedAt: new Date() })
        .where(eq(actividadesTable.id, id));
    }
  } catch {
    // continue
  }

  res.json({ success: true, message: "Inscripción cancelada", estado: "cancelado" });
});

export default router;
