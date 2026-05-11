import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { actividadesTable, configTable, inscripcionesTable, pagosTable, sociosTable } from "@workspace/db/schema";
import { eq, ilike, inArray } from "drizzle-orm";
import { odooCall } from "../lib/odoo";
import { requireAuth, requireRole } from "../middlewares/auth";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

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
    cardTexto: null as string | null,
    cardTextoEu: null as string | null,
    inscrito: false,
  };
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeIdentityText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

async function persistActividadImageIfNeeded(value: unknown): Promise<string | null> {
  const url = normalizeText(value);
  if (!url) return null;
  if (!url.startsWith("data:")) return url;
  const match = url.match(/^data:(image\/[^;]+);base64,(.+)$/);
  if (!match) return url;
  const mime = match[1];
  const base64 = match[2];
  const ext =
    mime === "image/png" ? "png"
      : mime === "image/webp" ? "webp"
        : "jpg";
  const fileName = `actividad-${Date.now()}-${randomUUID()}.${ext}`;
  const uploadsDir = path.resolve(process.cwd(), "artifacts/api-server/uploads/actividades");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, fileName), Buffer.from(base64, "base64"));
  return `/uploads/actividades/${fileName}`;
}

async function getCardTextMap() {
  const rows = await db.select().from(configTable).where(ilike(configTable.clave, "actividad.%"));
  const map = new Map<string, string | null>();
  for (const row of rows) {
    map.set(row.clave, row.valor ?? null);
  }
  return map;
}

function withCardTexts<T extends { id: number; descripcion?: string | null; descripcionEu?: string | null }>(
  item: T,
  cardTextMap: Map<string, string | null>,
) {
  const es = cardTextMap.get(`actividad.${item.id}.card_text`) ?? null;
  const eu = cardTextMap.get(`actividad.${item.id}.card_text_eu`) ?? null;
  const calendario = cardTextMap.get(`actividad.${item.id}.calendar_text`) ?? null;
  const calendarioEu = cardTextMap.get(`actividad.${item.id}.calendar_text_eu`) ?? null;
  const horarioEu = cardTextMap.get(`actividad.${item.id}.schedule_text_eu`) ?? null;
  const calendarStartMonth = cardTextMap.get(`actividad.${item.id}.calendar_start_month`) ?? null;
  const calendarDaysJson = cardTextMap.get(`actividad.${item.id}.calendar_days_json`) ?? null;
  const monitorNombre = cardTextMap.get(`actividad.${item.id}.monitor_nombre`) ?? null;
  const monitorNif = cardTextMap.get(`actividad.${item.id}.monitor_nif`) ?? null;
  const monitorDireccion = cardTextMap.get(`actividad.${item.id}.monitor_direccion`) ?? null;
  const monitorTelefono = cardTextMap.get(`actividad.${item.id}.monitor_telefono`) ?? null;
  const monitorEmail = cardTextMap.get(`actividad.${item.id}.monitor_email`) ?? null;
  const localNombre = cardTextMap.get(`actividad.${item.id}.local_nombre`) ?? null;
  const localUbicacion = cardTextMap.get(`actividad.${item.id}.local_ubicacion`) ?? null;
  const localConcesorNombre = cardTextMap.get(`actividad.${item.id}.local_concesor_nombre`) ?? null;
  const localConcesorTelefono = cardTextMap.get(`actividad.${item.id}.local_concesor_telefono`) ?? null;
  const localConcesorEmail = cardTextMap.get(`actividad.${item.id}.local_concesor_email`) ?? null;
  const localContratoPdfUrl = cardTextMap.get(`actividad.${item.id}.local_contrato_pdf_url`) ?? null;
  const facturasMonitorJson = cardTextMap.get(`actividad.${item.id}.facturas_monitor_json`) ?? null;
  return {
    ...item,
    cardTexto: es || item.descripcion || "",
    cardTextoEu: eu || item.descripcionEu || "",
    calendario: calendario || "",
    calendarioEu: calendarioEu || "",
    horarioEu: horarioEu || "",
    calendarStartMonth: calendarStartMonth || "",
    calendarDaysJson: calendarDaysJson || "[]",
    monitorNombre: monitorNombre || "",
    monitorNif: monitorNif || "",
    monitorDireccion: monitorDireccion || "",
    monitorTelefono: monitorTelefono || "",
    monitorEmail: monitorEmail || "",
    localNombre: localNombre || "",
    localUbicacion: localUbicacion || "",
    localConcesorNombre: localConcesorNombre || "",
    localConcesorTelefono: localConcesorTelefono || "",
    localConcesorEmail: localConcesorEmail || "",
    localContratoPdfUrl: localContratoPdfUrl || "",
    facturasMonitorJson: facturasMonitorJson || "[]",
  };
}

async function saveCardTexts(
  id: number,
  cardTexto: unknown,
  cardTextoEu: unknown,
  calendario: unknown,
  calendarioEu: unknown,
  horarioEu: unknown,
  calendarStartMonth: unknown,
  calendarDaysJson: unknown,
  monitorNombre: unknown,
  monitorNif: unknown,
  monitorDireccion: unknown,
  monitorTelefono: unknown,
  monitorEmail: unknown,
  localNombre: unknown,
  localUbicacion: unknown,
  localConcesorNombre: unknown,
  localConcesorTelefono: unknown,
  localConcesorEmail: unknown,
  localContratoPdfUrl: unknown,
  facturasMonitorJson: unknown,
) {
  const updates = [
    { clave: `actividad.${id}.card_text`, valor: normalizeText(cardTexto) },
    { clave: `actividad.${id}.card_text_eu`, valor: normalizeText(cardTextoEu) },
    { clave: `actividad.${id}.calendar_text`, valor: normalizeText(calendario) },
    { clave: `actividad.${id}.calendar_text_eu`, valor: normalizeText(calendarioEu) },
    { clave: `actividad.${id}.schedule_text_eu`, valor: normalizeText(horarioEu) },
    { clave: `actividad.${id}.calendar_start_month`, valor: normalizeText(calendarStartMonth) },
    { clave: `actividad.${id}.calendar_days_json`, valor: normalizeText(calendarDaysJson) || "[]" },
    { clave: `actividad.${id}.monitor_nombre`, valor: normalizeText(monitorNombre) },
    { clave: `actividad.${id}.monitor_nif`, valor: normalizeText(monitorNif) },
    { clave: `actividad.${id}.monitor_direccion`, valor: normalizeText(monitorDireccion) },
    { clave: `actividad.${id}.monitor_telefono`, valor: normalizeText(monitorTelefono) },
    { clave: `actividad.${id}.monitor_email`, valor: normalizeText(monitorEmail) },
    { clave: `actividad.${id}.local_nombre`, valor: normalizeText(localNombre) },
    { clave: `actividad.${id}.local_ubicacion`, valor: normalizeText(localUbicacion) },
    { clave: `actividad.${id}.local_concesor_nombre`, valor: normalizeText(localConcesorNombre) },
    { clave: `actividad.${id}.local_concesor_telefono`, valor: normalizeText(localConcesorTelefono) },
    { clave: `actividad.${id}.local_concesor_email`, valor: normalizeText(localConcesorEmail) },
    { clave: `actividad.${id}.local_contrato_pdf_url`, valor: normalizeText(localContratoPdfUrl) },
    { clave: `actividad.${id}.facturas_monitor_json`, valor: normalizeText(facturasMonitorJson) || "[]" },
  ];
  for (const item of updates) {
    await db
      .insert(configTable)
      .values({
        clave: item.clave,
        valor: item.valor,
        descripcion: null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: configTable.clave,
        set: {
          valor: item.valor,
          updatedAt: new Date(),
        },
      });
  }
}

async function saveConfigValue(clave: string, valor: unknown) {
  await db
    .insert(configTable)
    .values({
      clave,
      valor: normalizeText(valor),
      descripcion: null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: configTable.clave,
      set: {
        valor: normalizeText(valor),
        updatedAt: new Date(),
      },
    });
}

async function syncMonitorPartnerToOdoo(
  actividadId: number,
  monitor: {
    nombre?: unknown;
    nif?: unknown;
    direccion?: unknown;
    telefono?: unknown;
    email?: unknown;
  },
): Promise<void> {
  const nombre = normalizeText(monitor.nombre);
  const nif = normalizeText(monitor.nif);
  const direccion = normalizeText(monitor.direccion);
  const telefono = normalizeText(monitor.telefono);
  const email = normalizeText(monitor.email);

  if (!nombre && !nif && !direccion && !telefono && !email) {
    return;
  }

  const partnerIdKey = `actividad.${actividadId}.monitor_partner_odoo_id`;
  const config = await getCardTextMap();
  const storedPartnerId = Number(config.get(partnerIdKey) ?? 0) || null;

  let partnerId = storedPartnerId;

  if (!partnerId) {
    const domain: unknown[] = [];
    if (nif) domain.push(["vat", "=", nif]);
    else if (email) domain.push(["email", "=", email]);
    else if (nombre) domain.push(["name", "=", nombre]);

    if (domain.length > 0) {
      const found = (await odooCall("res.partner", "search_read", [domain], {
        fields: ["id"],
        limit: 1,
      })) as Array<Record<string, unknown>>;
      partnerId = found.length > 0 ? Number(found[0].id ?? 0) || null : null;
    }
  }

  const payload = {
    name: nombre || email || "Monitor actividad",
    vat: nif || false,
    street: direccion || false,
    phone: telefono || false,
    email: email || false,
    customer_rank: 0,
    supplier_rank: 1,
  };

  if (partnerId) {
    await odooCall("res.partner", "write", [[partnerId], payload]);
  } else {
    const created = await odooCall("res.partner", "create", [payload]);
    partnerId = Number(created ?? 0) || null;
  }

  if (partnerId) {
    await saveConfigValue(partnerIdKey, String(partnerId));
  }
}

router.get("/actividades", async (req, res): Promise<void> => {
  const { categoria, page = "1", limit = "10" } = req.query;
  const pageNum = parseInt(String(page), 10);
  const limitNum = parseInt(String(limit), 10);
  const offset = (pageNum - 1) * limitNum;

  // 1. Local DB first
  try {
    const cardTextMap = await getCardTextMap();
    const rows = await db.select().from(actividadesTable)
      .limit(limitNum).offset(offset);

    if (rows.length > 0) {
      let items = rows.map((row: any) => withCardTexts(dbRowToItem(row), cardTextMap));
      if (categoria) {
        items = items.filter((a: any) => a.categoria?.toLowerCase() === String(categoria).toLowerCase());
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
        cardTexto: String(e.description ?? ""),
        cardTextoEu: "",
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
    const cardTextMap = await getCardTextMap();
    const rows = await db.select().from(actividadesTable).where(eq(actividadesTable.id, id)).limit(1);
    if (rows.length > 0) {
      res.json(withCardTexts(dbRowToItem(rows[0]), cardTextMap));
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

router.post("/actividades", requireAuth, requireRole("directivo", "administrador"), async (req, res): Promise<void> => {
  const { nombre, nombreEu, descripcion, descripcionEu, categoria, horario, plazasTotal, precio, fotoUrl, imagen, cardTexto, cardTextoEu, calendario, calendarioEu, horarioEu, calendarStartMonth, calendarDaysJson, monitorNombre, monitorNif, monitorDireccion, monitorTelefono, monitorEmail, localNombre, localUbicacion, localConcesorNombre, localConcesorTelefono, localConcesorEmail, localContratoPdfUrl, facturasMonitorJson } = req.body ?? {};
  if (!nombre) {
    res.status(400).json({ error: "nombre es obligatorio" });
    return;
  }

  try {
    const plazasTotalNumRaw = Number(plazasTotal);
    const plazasTotalNum = Number.isFinite(plazasTotalNumRaw) ? plazasTotalNumRaw : 0;
    const precioNorm = normalizeText(precio);
    const persistedFotoUrl = await persistActividadImageIfNeeded(fotoUrl ?? imagen);
    const inserted = await db.insert(actividadesTable).values({
      nombre,
      nombreEu: nombreEu ?? null,
      descripcion: descripcion ?? null,
      descripcionEu: descripcionEu ?? null,
      categoria: categoria ?? null,
      horario: horario ?? null,
      plazasTotal: plazasTotalNum,
      plazasDisponibles: plazasTotalNum,
      precio: precioNorm || "0",
      estado: "disponible",
      fotoUrl: persistedFotoUrl,
    }).returning();
    await saveCardTexts(inserted[0].id, cardTexto, cardTextoEu, calendario, calendarioEu, horarioEu, calendarStartMonth, calendarDaysJson, monitorNombre, monitorNif, monitorDireccion, monitorTelefono, monitorEmail, localNombre, localUbicacion, localConcesorNombre, localConcesorTelefono, localConcesorEmail, localContratoPdfUrl, facturasMonitorJson);
    try {
      await syncMonitorPartnerToOdoo(inserted[0].id, {
        nombre: monitorNombre,
        nif: monitorNif,
        direccion: monitorDireccion,
        telefono: monitorTelefono,
        email: monitorEmail,
      });
    } catch {
      // Keep local persistence even when Odoo sync is unavailable.
    }
    const cardTextMap = await getCardTextMap();
    res.status(201).json(withCardTexts(dbRowToItem(inserted[0]), cardTextMap));
  } catch (err) {
    res.status(500).json({ error: "Error creando actividad", detalle: String(err) });
  }
});

router.put("/actividades/:id", requireAuth, requireRole("directivo", "administrador"), async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const { nombre, nombreEu, descripcion, descripcionEu, categoria, horario, plazasTotal, plazasDisponibles, precio, estado, fotoUrl, imagen, cardTexto, cardTextoEu, calendario, calendarioEu, horarioEu, calendarStartMonth, calendarDaysJson, monitorNombre, monitorNif, monitorDireccion, monitorTelefono, monitorEmail, localNombre, localUbicacion, localConcesorNombre, localConcesorTelefono, localConcesorEmail, localContratoPdfUrl, facturasMonitorJson } = req.body ?? {};

  try {
    const plazasTotalNum = String(plazasTotal ?? "").trim() !== "" ? Number(plazasTotal) : undefined;
    const plazasDisponiblesNum = String(plazasDisponibles ?? "").trim() !== "" ? Number(plazasDisponibles) : undefined;
    const precioNorm = String(precio ?? "").trim() !== "" ? String(precio) : undefined;
    const persistedFotoUrl = await persistActividadImageIfNeeded(fotoUrl ?? imagen);
    await db.update(actividadesTable).set({
      ...(nombre && { nombre }),
      ...(nombreEu !== undefined && { nombreEu }),
      ...(descripcion !== undefined && { descripcion }),
      ...(descripcionEu !== undefined && { descripcionEu }),
      ...(categoria !== undefined && { categoria }),
      ...(horario !== undefined && { horario }),
      ...(plazasTotalNum !== undefined && Number.isFinite(plazasTotalNum) && { plazasTotal: plazasTotalNum }),
      ...(plazasDisponiblesNum !== undefined && Number.isFinite(plazasDisponiblesNum) && { plazasDisponibles: plazasDisponiblesNum }),
      ...(precioNorm !== undefined && { precio: precioNorm }),
      ...(estado && { estado }),
      ...(persistedFotoUrl !== null && { fotoUrl: persistedFotoUrl }),
      updatedAt: new Date(),
    }).where(eq(actividadesTable.id, id));

    await saveCardTexts(id, cardTexto, cardTextoEu, calendario, calendarioEu, horarioEu, calendarStartMonth, calendarDaysJson, monitorNombre, monitorNif, monitorDireccion, monitorTelefono, monitorEmail, localNombre, localUbicacion, localConcesorNombre, localConcesorTelefono, localConcesorEmail, localContratoPdfUrl, facturasMonitorJson);
    try {
      await syncMonitorPartnerToOdoo(id, {
        nombre: monitorNombre,
        nif: monitorNif,
        direccion: monitorDireccion,
        telefono: monitorTelefono,
        email: monitorEmail,
      });
    } catch {
      // Keep local persistence even when Odoo sync is unavailable.
    }
    const cardTextMap = await getCardTextMap();
    const updated = await db.select().from(actividadesTable).where(eq(actividadesTable.id, id)).limit(1);
    res.json(updated.length > 0 ? withCardTexts(dbRowToItem(updated[0]), cardTextMap) : { id });
  } catch (err) {
    console.error("[actividades.put] Error actualizando actividad", {
      id,
      error: String(err),
    });
    res.status(500).json({ error: "Error actualizando actividad", detalle: String(err) });
  }
});

router.post("/actividades/:id/monitor-email", requireAuth, requireRole("directivo", "administrador"), async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const { subject, message, to } = req.body ?? {};
  const from = req.user?.email ?? null;

  if (!id || !to || !subject || !message) {
    res.status(400).json({ error: "Faltan destinatario, asunto o mensaje" });
    return;
  }

  try {
    const [mailId] = await Promise.all([
      odooCall("mail.mail", "create", [{
        email_from: from || "no-reply@denokbat.eus",
        email_to: String(to),
        subject: String(subject),
        body_html: `<pre style="font-family:inherit;white-space:pre-wrap">${String(message)}</pre>`,
      }]),
    ]);
    await odooCall("mail.mail", "send", [[mailId]]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "No se pudo enviar el correo al monitor", detalle: String(err) });
  }
});

router.post("/actividades/:id/local-email", requireAuth, requireRole("directivo", "administrador"), async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const { subject, message, to } = req.body ?? {};
  const from = req.user?.email ?? null;

  if (!id || !to || !subject || !message) {
    res.status(400).json({ error: "Faltan destinatario, asunto o mensaje" });
    return;
  }

  try {
    const created = await odooCall("mail.mail", "create", [{
      email_from: from || "no-reply@denokbat.eus",
      email_to: String(to),
      subject: String(subject),
      body_html: `<pre style="font-family:inherit;white-space:pre-wrap">${String(message)}</pre>`,
    }]);
    await odooCall("mail.mail", "send", [[created]]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "No se pudo enviar el correo al concesor", detalle: String(err) });
  }
});

router.get("/actividades/:id/facturas-monitor", requireAuth, requireRole("directivo", "administrador"), async (req, res): Promise<void> => {
  const actividadId = parseInt(String(req.params.id), 10);
  if (!actividadId) {
    res.status(400).json({ error: "Actividad inválida" });
    return;
  }

  try {
    const config = await getCardTextMap();
    const partnerId = Number(config.get(`actividad.${actividadId}.monitor_partner_odoo_id`) ?? 0) || null;
    if (!partnerId) {
      res.json({ items: [], odooStatus: "no_monitor_partner" });
      return;
    }

    const invoices = (await odooCall("membership_membership_line", "search_read", [[
      ["partner_id", "=", partnerId],
      ["move_type", "in", ["in_invoice", "in_refund"]],
      ["state", "!=", "cancel"],
    ]], {
      fields: ["id", "name", "ref", "amount_total", "payment_state", "invoice_date", "narration"],
      order: "invoice_date desc, id desc",
      limit: 100,
    })) as Array<Record<string, unknown>>;

    const items = Array.isArray(invoices)
      ? invoices.map((inv) => ({
          id: Number(inv.id ?? 0),
          concepto: String(inv.ref ?? inv.name ?? ""),
          importe: Number(inv.amount_total ?? 0),
          pagada: String(inv.payment_state ?? "") === "paid",
          observaciones: String(inv.narration ?? ""),
          fecha: inv.invoice_date ? String(inv.invoice_date) : "",
        }))
      : [];

    res.json({ items, odooStatus: items.length > 0 ? "ok" : "no_data" });
  } catch (err) {
    // Odoo puede no exponer membership_membership_line para este usuario/entorno; no bloqueamos la UI.
    res.json({
      items: [],
      odooStatus: "odoo_unavailable",
      warning: "No se pudieron cargar las facturas del monitor desde Odoo",
      detalle: String(err),
    });
  }
});

router.get("/actividades/:id/inscritos", requireAuth, requireRole("directivo", "administrador"), async (req, res): Promise<void> => {
  const actividadId = parseInt(String(req.params.id), 10);
  if (!actividadId) {
    res.status(400).json({ error: "Actividad inválida" });
    return;
  }

  try {
    const inscripciones = await db
      .select()
      .from(inscripcionesTable)
      .where(eq(inscripcionesTable.actividadId, actividadId));

    const socioIds = inscripciones.map((i) => i.socioId).filter((v): v is number => typeof v === "number");
    const inscripcionIds = inscripciones.map((i) => i.id);

    const [socios, pagos] = await Promise.all([
      socioIds.length
        ? db.select().from(sociosTable)
          .where(inArray(sociosTable.id, socioIds))
        : Promise.resolve([]),
      inscripcionIds.length
        ? db.select().from(pagosTable)
          .where(inArray(pagosTable.inscripcionId, inscripcionIds))
        : Promise.resolve([]),
    ]);

    const socioMap = new Map<number, typeof sociosTable.$inferSelect>();
    for (const s of socios) {
      if (socioIds.includes(s.id)) socioMap.set(s.id, s);
    }
    const pagoMap = new Map<number, typeof pagosTable.$inferSelect>();
    for (const p of pagos) {
      if (p.inscripcionId != null) pagoMap.set(p.inscripcionId, p);
    }

    res.json({
      items: inscripciones.map((ins) => {
        const socio = ins.socioId ? socioMap.get(ins.socioId) : null;
        const pago = pagoMap.get(ins.id) ?? null;
        return {
          id: ins.id,
          socioId: ins.socioId,
          nombre: `${socio?.nombre ?? ""} ${socio?.apellidos ?? ""}`.trim(),
          email: socio?.email ?? "",
          telefono: socio?.telefono ?? "",
          precio: pago?.importe ?? "0",
          pagoRealizado: pago?.estado === "pagado",
          observaciones: ins.observaciones ?? "",
        };
      }),
    });
  } catch (err) {
    res.status(500).json({ error: "Error cargando inscritos", detalle: String(err) });
  }
});

router.put("/actividades/:id/inscritos/:inscripcionId", requireAuth, requireRole("directivo", "administrador"), async (req, res): Promise<void> => {
  const actividadId = parseInt(String(req.params.id), 10);
  const inscripcionId = parseInt(String(req.params.inscripcionId), 10);
  const { precio, pagoRealizado, observaciones } = req.body ?? {};

  if (!actividadId || !inscripcionId) {
    res.status(400).json({ error: "Identificadores inválidos" });
    return;
  }

  try {
    const [inscripcion] = await db.select().from(inscripcionesTable).where(eq(inscripcionesTable.id, inscripcionId)).limit(1);
    if (!inscripcion || inscripcion.actividadId !== actividadId) {
      res.status(404).json({ error: "Inscripción no encontrada" });
      return;
    }

    await db.update(inscripcionesTable).set({
      observaciones: observaciones ?? null,
      updatedAt: new Date(),
    }).where(eq(inscripcionesTable.id, inscripcionId));

    const existingPagos = await db.select().from(pagosTable).where(eq(pagosTable.inscripcionId, inscripcionId)).limit(1);
    if (existingPagos.length > 0) {
      await db.update(pagosTable).set({
        importe: String(precio ?? existingPagos[0].importe ?? "0"),
        estado: pagoRealizado ? "pagado" : "pendiente",
        fechaPago: pagoRealizado ? new Date() : null,
        updatedAt: new Date(),
      }).where(eq(pagosTable.id, existingPagos[0].id));
    } else {
      await db.insert(pagosTable).values({
        socioId: inscripcion.socioId,
        inscripcionId,
        concepto: `Inscripción actividad #${actividadId}`,
        importe: String(precio ?? "0"),
        metodo: "manual",
        estado: pagoRealizado ? "pagado" : "pendiente",
        fechaPago: pagoRealizado ? new Date() : null,
      });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error actualizando inscrito", detalle: String(err) });
  }
});

router.delete("/actividades/:id", requireAuth, requireRole("directivo", "administrador"), async (req, res): Promise<void> => {
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

router.post("/actividades/:id/inscripcion-form", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id), 10);
  const user = req.user!;
  const {
    nombre,
    apellidos,
    dni,
    email,
    metodoPago,
    cuotaPagada,
  } = req.body ?? {};

  if (!id || !nombre || (!dni && !email)) {
    res.status(400).json({ error: "Datos de inscripción incompletos" });
    return;
  }

  try {
    const [actividad] = await db.select().from(actividadesTable).where(eq(actividadesTable.id, id)).limit(1);
    if (!actividad) {
      res.status(404).json({ error: "Actividad no encontrada" });
      return;
    }
    if (Number(actividad.plazasDisponibles ?? 0) <= 0) {
      res.status(400).json({ error: "No hay plazas disponibles" });
      return;
    }

    const cleanDni = String(dni ?? "").trim();
    const cleanEmail = String(email ?? "").trim();
    let socioRows: Array<typeof sociosTable.$inferSelect> = [];
    if (cleanDni) {
      socioRows = await db.select().from(sociosTable).where(ilike(sociosTable.dni, cleanDni)).limit(1);
    }
    if (socioRows.length === 0 && cleanEmail) {
      socioRows = await db.select().from(sociosTable).where(ilike(sociosTable.email, cleanEmail)).limit(1);
    }
    if (socioRows.length === 0) {
      res.status(404).json({ error: "No existe socio con esa identidad (DNI/NIE o email)" });
      return;
    }
    const socio = socioRows[0];

    const sameEmail = normalizeIdentityText(socio.email) === normalizeIdentityText(email);
    const sameName = normalizeIdentityText(socio.nombre) === normalizeIdentityText(nombre);
    const sameSurname = !apellidos || normalizeIdentityText(socio.apellidos) === normalizeIdentityText(apellidos);
    if (!sameName || (!sameEmail && String(email ?? "").trim() !== "") || !sameSurname) {
      res.status(400).json({ error: "La identidad no coincide con el socio registrado" });
      return;
    }

    const [inscripcion] = await db.insert(inscripcionesTable).values({
      socioId: socio.id,
      actividadId: id,
      tipo: "actividad",
      estado: "confirmada",
      observaciones: null,
    }).returning();

    await db.update(actividadesTable)
      .set({ plazasDisponibles: Number(actividad.plazasDisponibles ?? 0) - 1, updatedAt: new Date() })
      .where(eq(actividadesTable.id, id));

    const importe = Number(actividad.precio ?? 0);
    let pago = null;
    if (importe > 0) {
      const metodoNormalizado = ["transferencia", "tarjeta"].includes(String(metodoPago ?? ""))
        ? String(metodoPago)
        : "transferencia";
      const [p] = await db.insert(pagosTable).values({
        socioId: socio.id,
        inscripcionId: inscripcion.id,
        concepto: `Inscripción actividad: ${actividad.nombre}`,
        importe: String(importe),
        metodo: metodoNormalizado,
        estado: cuotaPagada ? "pagado" : "pendiente",
        fechaPago: cuotaPagada ? new Date() : null,
      }).returning();
      pago = p;
    }

    res.status(201).json({
      ok: true,
      inscripcionId: inscripcion.id,
      socioId: socio.id,
      pago,
    });
  } catch (err) {
    res.status(500).json({ error: "Error creando inscripción de actividad", detalle: String(err) });
  }
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
