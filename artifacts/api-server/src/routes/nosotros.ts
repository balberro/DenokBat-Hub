import { Router, type IRouter } from "express";
import { and, asc, desc, eq, gte, ilike, inArray, isNull, or } from "drizzle-orm";
import { db } from "@workspace/db";
import { actasAsambleaTable, cargosTable, configTable, estatutosTable, historicoCargosTable, sociosTable, usersTable } from "@workspace/db/schema";
import { requireAuth, requireRole } from "../middlewares/auth";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const router: IRouter = Router();

const CONFIG_KEYS = {
  quienesSomosTitle: "nosotros.quienes_somos_title",
  presentacionTitle: "nosotros.presentacion_title",
  historiaEs: "nosotros.historia_es",
  historiaEu: "nosotros.historia_eu",
  hitosJson: "nosotros.hitos_json",
} as const;

type HitoItem = {
  year: string;
  texto: string;
  textoEu: string;
  icon: string;
  imageUrl?: string;
};

const DEFAULT_HITOS: HitoItem[] = [
  { year: "1985", texto: "Fundacion", textoEu: "Sorrera", icon: "🌱" },
  { year: "1992", texto: "Primera sede", textoEu: "Lehen egoitza", icon: "🏠" },
  { year: "2005", texto: "500 socios", textoEu: "500 bazkide", icon: "🎉" },
  { year: "2026", texto: "+1.200 socios", textoEu: "+1.200 bazkide", icon: "⭐" },
];

const DEFAULT_CARGOS = [
  { codigo: "fundador", nombre: "Fundador/a", nombreEu: "Sortzailea", ambito: "fundador" },
  { codigo: "presidencia", nombre: "Presidencia", nombreEu: "Presidentzia", ambito: "directivo" },
  { codigo: "vicepresidencia", nombre: "Vicepresidencia", nombreEu: "Presidenteordetza", ambito: "directivo" },
  { codigo: "secretaria", nombre: "Secretaria", nombreEu: "Idazkaria", ambito: "directivo" },
  { codigo: "tesoreria", nombre: "Tesoreria", nombreEu: "Diruzaintza", ambito: "directivo" },
  { codigo: "vocal", nombre: "Vocal", nombreEu: "Bozeramailea", ambito: "directivo" },
  { codigo: "delegado_zona", nombre: "Delegado/a de zona", nombreEu: "Zona ordezkaria", ambito: "delegado" },
] as const;

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function parseDateAsNumber(value: string | null | undefined): number {
  if (!value) return Number.NaN;
  const time = Date.parse(`${value}T00:00:00`);
  return Number.isNaN(time) ? Number.NaN : time;
}

function rangesOverlap(
  startA: string,
  endA: string | null | undefined,
  startB: string,
  endB: string | null | undefined,
): boolean {
  const aStart = parseDateAsNumber(startA);
  const bStart = parseDateAsNumber(startB);
  const aEnd = endA ? parseDateAsNumber(endA) : Number.POSITIVE_INFINITY;
  const bEnd = endB ? parseDateAsNumber(endB) : Number.POSITIVE_INFINITY;
  if (Number.isNaN(aStart) || Number.isNaN(bStart) || Number.isNaN(aEnd) || Number.isNaN(bEnd)) return false;
  return aStart <= bEnd && bStart <= aEnd;
}

function inferExtensionFromMime(mime: string): string {
  if (mime === "application/pdf") return "pdf";
  return "bin";
}

async function persistPdfIfNeeded(value: unknown): Promise<string | null> {
  const url = normalizeText(value);
  if (!url) return null;
  if (!url.startsWith("data:")) return url;
  const match = url.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return url;
  const mime = match[1];
  const base64 = match[2];
  const ext = inferExtensionFromMime(mime);
  const fileName = `estatutos-${Date.now()}-${randomUUID()}.${ext}`;
  const uploadsDir = path.resolve(process.cwd(), "artifacts/api-server/uploads/estatutos");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, fileName), Buffer.from(base64, "base64"));
  return `/uploads/estatutos/${fileName}`;
}

async function ensureDefaultCargos() {
  for (const item of DEFAULT_CARGOS) {
    await db.insert(cargosTable).values({
      codigo: item.codigo,
      nombre: item.nombre,
      nombreEu: item.nombreEu,
      ambito: item.ambito,
    }).onConflictDoNothing();
  }
}

function parseHitos(raw: string | null | undefined): HitoItem[] {
  if (!raw) return DEFAULT_HITOS;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_HITOS;
    const hitos = parsed
      .map((h): HitoItem => ({
        year: normalizeText((h as Record<string, unknown>).year),
        texto: normalizeText((h as Record<string, unknown>).texto),
        textoEu: normalizeText((h as Record<string, unknown>).textoEu),
        icon: normalizeText((h as Record<string, unknown>).icon),
        imageUrl: normalizeText((h as Record<string, unknown>).imageUrl),
      }))
      .filter((h) => h.year || h.texto || h.textoEu || h.icon || h.imageUrl);
    return hitos.length > 0 ? hitos : DEFAULT_HITOS;
  } catch {
    return DEFAULT_HITOS;
  }
}

async function getConfigMap() {
  const rows = await db.select().from(configTable).where(inArray(configTable.clave, Object.values(CONFIG_KEYS)));
  const byKey = new Map<string, string | null>();
  for (const row of rows) byKey.set(row.clave, row.valor ?? null);
  return byKey;
}

async function safeSelectNosotrosDocs() {
  try {
    const [estatutosRows, actasRows] = await Promise.all([
      db.select().from(estatutosTable).orderBy(desc(estatutosTable.vigenciaDesde), desc(estatutosTable.id)),
      db.select().from(actasAsambleaTable).orderBy(desc(actasAsambleaTable.fechaActa), desc(actasAsambleaTable.id)),
    ]);
    return { estatutosRows, actasRows };
  } catch (err) {
    // Allow old databases (without new tables yet) to keep working.
    const message = String(err ?? "");
    if (message.includes("db_estatutos") || message.includes("db_actas_asamblea")) {
      return { estatutosRows: [], actasRows: [] };
    }
    throw err;
  }
}

router.get("/nosotros/public", async (_req, res): Promise<void> => {
  try {
    await ensureDefaultCargos();
    const today = new Date().toISOString().slice(0, 10);
    const config = await getConfigMap();
    const { estatutosRows, actasRows } = await safeSelectNosotrosDocs();

    const organigrama = await db.select({
      id: historicoCargosTable.id,
      ambito: cargosTable.ambito,
      cargo: cargosTable.nombre,
      cargoEu: cargosTable.nombreEu,
      descripcion: historicoCargosTable.descripcion,
      descripcionEu: historicoCargosTable.descripcionEu,
      fechaInicio: historicoCargosTable.fechaInicio,
      fechaFin: historicoCargosTable.fechaFin,
      socioId: sociosTable.id,
      nombre: sociosTable.nombre,
      apellidos: sociosTable.apellidos,
      avatarUrl: sociosTable.avatarUrl,
    }).from(historicoCargosTable)
      .innerJoin(cargosTable, eq(cargosTable.id, historicoCargosTable.cargoId))
      .innerJoin(sociosTable, eq(sociosTable.id, historicoCargosTable.socioId))
      .where(
        and(
          eq(cargosTable.activo, 1),
          or(
            eq(cargosTable.ambito, "fundador"),
            isNull(historicoCargosTable.fechaFin),
            gte(historicoCargosTable.fechaFin, today),
          ),
        ),
      )
      .orderBy(asc(cargosTable.ambito), desc(historicoCargosTable.fechaInicio));

    const grouped = {
      fundadores: [] as Record<string, unknown>[],
      directivos: [] as Record<string, unknown>[],
      delegados: [] as Record<string, unknown>[],
    };
    for (const item of organigrama) {
      const member = {
        id: item.id,
        socioId: item.socioId,
        nombre: `${item.nombre ?? ""} ${item.apellidos ?? ""}`.trim(),
        cargo: item.cargo ?? "",
        cargoEu: item.cargoEu ?? item.cargo ?? "",
        descripcion: item.descripcion ?? "",
        descripcionEu: item.descripcionEu ?? item.descripcion ?? "",
        foto: item.avatarUrl ?? "",
      };
      if (item.ambito === "fundador") grouped.fundadores.push(member);
      else if (item.ambito === "delegado") grouped.delegados.push(member);
      else grouped.directivos.push(member);
    }

    const estatutosActuales = estatutosRows.filter((e) =>
      e.vigenciaDesde <= today && (!e.vigenciaHasta || e.vigenciaHasta >= today),
    );
    const estatutosAnteriores = estatutosRows.filter((e) =>
      !(e.vigenciaDesde <= today && (!e.vigenciaHasta || e.vigenciaHasta >= today)),
    );

    res.json({
      textos: {
        quienesSomosTitle: config.get(CONFIG_KEYS.quienesSomosTitle) ?? "",
        presentacionTitle: config.get(CONFIG_KEYS.presentacionTitle) ?? "",
        historiaEs: config.get(CONFIG_KEYS.historiaEs) ?? "",
        historiaEu: config.get(CONFIG_KEYS.historiaEu) ?? "",
      },
      hitos: parseHitos(config.get(CONFIG_KEYS.hitosJson) ?? null),
      estatutos: {
        actuales: estatutosActuales,
        anteriores: estatutosAnteriores,
      },
      actasAsamblea: actasRows,
      organigrama: grouped,
    });
  } catch (err) {
    res.status(500).json({ error: "Error cargando datos de nosotros", detalle: String(err) });
  }
});

router.get("/admin/nosotros", requireAuth, requireRole("directivo", "administrador"), async (_req, res): Promise<void> => {
  try {
    await ensureDefaultCargos();
    const config = await getConfigMap();
    const [{ estatutosRows: estatutos, actasRows: actasAsamblea }, cargos, historico, socios, adminUsers] = await Promise.all([
      safeSelectNosotrosDocs(),
      db.select().from(cargosTable).orderBy(asc(cargosTable.ambito), asc(cargosTable.nombre)),
      db.select().from(historicoCargosTable).orderBy(desc(historicoCargosTable.fechaInicio)),
      db.select({
        id: sociosTable.id,
        nombre: sociosTable.nombre,
        apellidos: sociosTable.apellidos,
        avatarUrl: sociosTable.avatarUrl,
      }).from(sociosTable).orderBy(asc(sociosTable.nombre), asc(sociosTable.apellidos)),
      db.select({
        socioId: usersTable.socioId,
      }).from(usersTable).where(eq(usersTable.rol, "administrador")),
    ]);

    res.json({
      textos: {
        quienesSomosTitle: config.get(CONFIG_KEYS.quienesSomosTitle) ?? "",
        presentacionTitle: config.get(CONFIG_KEYS.presentacionTitle) ?? "",
        historiaEs: config.get(CONFIG_KEYS.historiaEs) ?? "",
        historiaEu: config.get(CONFIG_KEYS.historiaEu) ?? "",
      },
      hitos: parseHitos(config.get(CONFIG_KEYS.hitosJson) ?? null),
      cargos,
      historico,
      socios,
      adminSocioIds: adminUsers
        .map((u) => u.socioId)
        .filter((id): id is number => Number.isFinite(id ?? NaN)),
      estatutos,
      actasAsamblea,
    });
  } catch (err) {
    res.status(500).json({ error: "Error cargando admin de nosotros", detalle: String(err) });
  }
});

router.put("/admin/nosotros/config", requireAuth, requireRole("directivo", "administrador"), async (req, res): Promise<void> => {
  const textos = (req.body?.textos ?? {}) as Record<string, unknown>;
  const hitos = (req.body?.hitos ?? []) as unknown[];
  const updates = [
    { clave: CONFIG_KEYS.quienesSomosTitle, valor: normalizeText(textos.quienesSomosTitle) },
    { clave: CONFIG_KEYS.presentacionTitle, valor: normalizeText(textos.presentacionTitle) },
    { clave: CONFIG_KEYS.historiaEs, valor: normalizeText(textos.historiaEs) },
    { clave: CONFIG_KEYS.historiaEu, valor: normalizeText(textos.historiaEu) },
    {
      clave: CONFIG_KEYS.hitosJson,
      valor: JSON.stringify(
        (Array.isArray(hitos) ? hitos : []).map((h) => ({
          year: normalizeText((h as Record<string, unknown>).year),
          texto: normalizeText((h as Record<string, unknown>).texto),
          textoEu: normalizeText((h as Record<string, unknown>).textoEu),
          icon: normalizeText((h as Record<string, unknown>).icon),
          imageUrl: normalizeText((h as Record<string, unknown>).imageUrl),
        })),
      ),
    },
  ];

  try {
    for (const item of updates) {
      await db.insert(configTable).values({
        clave: item.clave,
        valor: item.valor,
        descripcion: null,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: configTable.clave,
        set: {
          valor: item.valor,
          updatedAt: new Date(),
        },
      });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error guardando configuración de nosotros", detalle: String(err) });
  }
});

router.post("/admin/nosotros/cargos", requireAuth, requireRole("directivo", "administrador"), async (req, res): Promise<void> => {
  const payload = req.body ?? {};
  const codigo = normalizeText(payload.codigo);
  const nombre = normalizeText(payload.nombre);
  const nombreEu = normalizeText(payload.nombreEu);
  const ambito = normalizeText(payload.ambito || "directivo");
  if (!codigo || !nombre) {
    res.status(400).json({ error: "codigo y nombre son obligatorios" });
    return;
  }

  try {
    const [created] = await db.insert(cargosTable).values({
      codigo,
      nombre,
      nombreEu: nombreEu || null,
      ambito: ambito || "directivo",
      updatedAt: new Date(),
    }).returning();
    res.json(created);
  } catch (err) {
    res.status(500).json({ error: "Error creando cargo", detalle: String(err) });
  }
});

router.put("/admin/nosotros/cargos/:id", requireAuth, requireRole("directivo", "administrador"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "id inválido" });
    return;
  }
  const payload = req.body ?? {};
  try {
    const [updated] = await db.update(cargosTable).set({
      nombre: normalizeText(payload.nombre),
      nombreEu: normalizeText(payload.nombreEu) || null,
      ambito: normalizeText(payload.ambito || "directivo"),
      activo: Number(payload.activo) === 0 ? 0 : 1,
      updatedAt: new Date(),
    }).where(eq(cargosTable.id, id)).returning();
    if (!updated) {
      res.status(404).json({ error: "Cargo no encontrado" });
      return;
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Error actualizando cargo", detalle: String(err) });
  }
});

router.delete("/admin/nosotros/cargos/:id", requireAuth, requireRole("directivo", "administrador"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "id inválido" });
    return;
  }
  try {
    const inUse = await db.select({ id: historicoCargosTable.id })
      .from(historicoCargosTable)
      .where(eq(historicoCargosTable.cargoId, id))
      .limit(1);
    if (inUse.length > 0) {
      res.status(409).json({ error: "No se puede eliminar: el cargo tiene histórico asociado" });
      return;
    }

    const deleted = await db.delete(cargosTable).where(eq(cargosTable.id, id)).returning();
    if (!deleted.length) {
      res.status(404).json({ error: "Cargo no encontrado" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error eliminando cargo", detalle: String(err) });
  }
});

router.post("/admin/nosotros/historico", requireAuth, requireRole("directivo", "administrador"), async (req, res): Promise<void> => {
  const payload = req.body ?? {};
  const socioId = Number(payload.socioId);
  const cargoId = Number(payload.cargoId);
  const fechaInicio = normalizeText(payload.fechaInicio);
  const fechaFin = normalizeText(payload.fechaFin) || null;
  if (!Number.isFinite(socioId) || !Number.isFinite(cargoId) || !fechaInicio) {
    res.status(400).json({ error: "socioId, cargoId y fechaInicio son obligatorios" });
    return;
  }
  const inicioTs = parseDateAsNumber(fechaInicio);
  const finTs = fechaFin ? parseDateAsNumber(fechaFin) : Number.NaN;
  if (Number.isNaN(inicioTs)) {
    res.status(400).json({ error: "fechaInicio inválida (formato esperado: YYYY-MM-DD)" });
    return;
  }
  if (fechaFin && Number.isNaN(finTs)) {
    res.status(400).json({ error: "fechaFin inválida (formato esperado: YYYY-MM-DD)" });
    return;
  }
  if (fechaFin && finTs < inicioTs) {
    res.status(400).json({ error: "fechaFin no puede ser anterior a fechaInicio" });
    return;
  }

  try {
    const [socio, cargo] = await Promise.all([
      db.select({ id: sociosTable.id }).from(sociosTable).where(eq(sociosTable.id, socioId)).limit(1),
      db.select({ id: cargosTable.id }).from(cargosTable).where(eq(cargosTable.id, cargoId)).limit(1),
    ]);
    if (!socio.length) {
      res.status(404).json({ error: "Socio no encontrado" });
      return;
    }
    if (!cargo.length) {
      res.status(404).json({ error: "Cargo no encontrado" });
      return;
    }
    const existing = await db.select({
      id: historicoCargosTable.id,
      fechaInicio: historicoCargosTable.fechaInicio,
      fechaFin: historicoCargosTable.fechaFin,
    }).from(historicoCargosTable).where(
      and(
        eq(historicoCargosTable.socioId, socioId),
        eq(historicoCargosTable.cargoId, cargoId),
      ),
    );
    const hasOverlap = existing.some((row) =>
      rangesOverlap(fechaInicio, fechaFin, row.fechaInicio, row.fechaFin),
    );
    if (hasOverlap) {
      res.status(409).json({ error: "Ya existe un periodo solapado para ese socio y cargo" });
      return;
    }

    const [created] = await db.insert(historicoCargosTable).values({
      socioId,
      cargoId,
      fechaInicio,
      fechaFin,
      descripcion: normalizeText(payload.descripcion) || null,
      descripcionEu: normalizeText(payload.descripcionEu) || null,
      updatedAt: new Date(),
    }).returning();
    res.json(created);
  } catch (err) {
    res.status(500).json({ error: "Error creando histórico de cargo", detalle: String(err) });
  }
});

router.put("/admin/nosotros/historico/:id", requireAuth, requireRole("directivo", "administrador"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "id inválido" });
    return;
  }
  const payload = req.body ?? {};
  try {
    const socioId = Number(payload.socioId);
    const cargoId = Number(payload.cargoId);
    const fechaInicio = normalizeText(payload.fechaInicio);
    const fechaFin = normalizeText(payload.fechaFin) || null;
    if (!Number.isFinite(socioId) || !Number.isFinite(cargoId) || !fechaInicio) {
      res.status(400).json({ error: "socioId, cargoId y fechaInicio son obligatorios" });
      return;
    }
    const inicioTs = parseDateAsNumber(fechaInicio);
    const finTs = fechaFin ? parseDateAsNumber(fechaFin) : Number.NaN;
    if (Number.isNaN(inicioTs)) {
      res.status(400).json({ error: "fechaInicio inválida (formato esperado: YYYY-MM-DD)" });
      return;
    }
    if (fechaFin && Number.isNaN(finTs)) {
      res.status(400).json({ error: "fechaFin inválida (formato esperado: YYYY-MM-DD)" });
      return;
    }
    if (fechaFin && finTs < inicioTs) {
      res.status(400).json({ error: "fechaFin no puede ser anterior a fechaInicio" });
      return;
    }
    const [socio, cargo] = await Promise.all([
      db.select({ id: sociosTable.id }).from(sociosTable).where(eq(sociosTable.id, socioId)).limit(1),
      db.select({ id: cargosTable.id }).from(cargosTable).where(eq(cargosTable.id, cargoId)).limit(1),
    ]);
    if (!socio.length) {
      res.status(404).json({ error: "Socio no encontrado" });
      return;
    }
    if (!cargo.length) {
      res.status(404).json({ error: "Cargo no encontrado" });
      return;
    }
    const existing = await db.select({
      id: historicoCargosTable.id,
      fechaInicio: historicoCargosTable.fechaInicio,
      fechaFin: historicoCargosTable.fechaFin,
    }).from(historicoCargosTable).where(
      and(
        eq(historicoCargosTable.socioId, socioId),
        eq(historicoCargosTable.cargoId, cargoId),
      ),
    );
    const hasOverlap = existing.some((row) =>
      row.id !== id && rangesOverlap(fechaInicio, fechaFin, row.fechaInicio, row.fechaFin),
    );
    if (hasOverlap) {
      res.status(409).json({ error: "Ya existe un periodo solapado para ese socio y cargo" });
      return;
    }

    const [updated] = await db.update(historicoCargosTable).set({
      socioId,
      cargoId,
      fechaInicio,
      fechaFin,
      descripcion: normalizeText(payload.descripcion) || null,
      descripcionEu: normalizeText(payload.descripcionEu) || null,
      updatedAt: new Date(),
    }).where(eq(historicoCargosTable.id, id)).returning();
    if (!updated) {
      res.status(404).json({ error: "Histórico no encontrado" });
      return;
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Error actualizando histórico de cargo", detalle: String(err) });
  }
});

router.get("/admin/nosotros/historico", requireAuth, requireRole("contable", "directivo", "administrador"), async (req, res): Promise<void> => {
  const socioId = Number(req.query.socioId);
  const cargoId = Number(req.query.cargoId);
  const onlyCurrent = normalizeText(req.query.onlyCurrent).toLowerCase() === "true";
  const includeFinished = normalizeText(req.query.includeFinished).toLowerCase() === "true";
  const from = normalizeText(req.query.from);
  const to = normalizeText(req.query.to);
  const role = normalizeText(req.query.role).toLowerCase();

  try {
    const rows = await db.select({
      id: historicoCargosTable.id,
      socioId: historicoCargosTable.socioId,
      cargoId: historicoCargosTable.cargoId,
      fechaInicio: historicoCargosTable.fechaInicio,
      fechaFin: historicoCargosTable.fechaFin,
      descripcion: historicoCargosTable.descripcion,
      descripcionEu: historicoCargosTable.descripcionEu,
      cargoCodigo: cargosTable.codigo,
      cargoNombre: cargosTable.nombre,
      cargoNombreEu: cargosTable.nombreEu,
      cargoAmbito: cargosTable.ambito,
      activo: cargosTable.activo,
      nombre: sociosTable.nombre,
      apellidos: sociosTable.apellidos,
      avatarUrl: sociosTable.avatarUrl,
    }).from(historicoCargosTable)
      .innerJoin(cargosTable, eq(cargosTable.id, historicoCargosTable.cargoId))
      .innerJoin(sociosTable, eq(sociosTable.id, historicoCargosTable.socioId))
      .orderBy(desc(historicoCargosTable.fechaInicio), desc(historicoCargosTable.id));

    const today = new Date().toISOString().slice(0, 10);
    const results = rows.filter((row) => {
      if (Number.isFinite(socioId) && row.socioId !== socioId) return false;
      if (Number.isFinite(cargoId) && row.cargoId !== cargoId) return false;
      if (from && row.fechaInicio < from) return false;
      if (to && row.fechaInicio > to) return false;
      if (onlyCurrent) {
        if (row.fechaFin && row.fechaFin < today) return false;
      } else if (!includeFinished) {
        // Por defecto no filtramos nada; includeFinished=true solo tiene efecto combinado con role.
      }
      if (role) {
        const codigo = normalizeText(row.cargoCodigo).toLowerCase();
        const nombre = normalizeText(row.cargoNombre).toLowerCase();
        const isContable = codigo.includes("tesorer") || codigo.includes("contable") || nombre.includes("tesorer") || nombre.includes("contable");
        if (role === "contable" && !isContable) return false;
        if (role === "directivo" && row.cargoAmbito !== "directivo") return false;
        if (role === "delegado" && row.cargoAmbito !== "delegado") return false;
      }
      return true;
    });

    res.json({ items: results });
  } catch (err) {
    res.status(500).json({ error: "Error consultando histórico de cargos", detalle: String(err) });
  }
});

router.delete("/admin/nosotros/historico/:id", requireAuth, requireRole("directivo", "administrador"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "id inválido" });
    return;
  }
  try {
    const deleted = await db.delete(historicoCargosTable).where(eq(historicoCargosTable.id, id)).returning();
    if (!deleted.length) {
      res.status(404).json({ error: "Histórico no encontrado" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error eliminando histórico de cargo", detalle: String(err) });
  }
});

router.post("/admin/nosotros/estatutos", requireAuth, requireRole("directivo", "administrador"), async (req, res): Promise<void> => {
  const payload = req.body ?? {};
  const titulo = normalizeText(payload.titulo);
  const vigenciaDesde = normalizeText(payload.vigenciaDesde);
  const vigenciaHasta = normalizeText(payload.vigenciaHasta);
  if (!titulo || !vigenciaDesde || !payload.pdfUrl) {
    res.status(400).json({ error: "titulo, vigenciaDesde y pdfUrl son obligatorios" });
    return;
  }
  try {
    const pdfUrl = await persistPdfIfNeeded(payload.pdfUrl);
    if (!pdfUrl) {
      res.status(400).json({ error: "pdfUrl no válido" });
      return;
    }
    const [created] = await db.insert(estatutosTable).values({
      titulo,
      tituloEu: normalizeText(payload.tituloEu) || null,
      pdfUrl,
      vigenciaDesde,
      vigenciaHasta: vigenciaHasta || null,
      updatedAt: new Date(),
    }).returning();
    res.json(created);
  } catch (err) {
    res.status(500).json({ error: "Error creando estatuto", detalle: String(err) });
  }
});

router.put("/admin/nosotros/estatutos/:id", requireAuth, requireRole("directivo", "administrador"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "id inválido" });
    return;
  }
  const payload = req.body ?? {};
  try {
    const current = await db.select().from(estatutosTable).where(eq(estatutosTable.id, id)).limit(1);
    if (!current.length) {
      res.status(404).json({ error: "Estatuto no encontrado" });
      return;
    }
    const pdfUrl = payload.pdfUrl !== undefined
      ? await persistPdfIfNeeded(payload.pdfUrl)
      : current[0].pdfUrl;
    const [updated] = await db.update(estatutosTable).set({
      titulo: normalizeText(payload.titulo || current[0].titulo),
      tituloEu: normalizeText(payload.tituloEu ?? current[0].tituloEu ?? "") || null,
      pdfUrl: pdfUrl || current[0].pdfUrl,
      vigenciaDesde: normalizeText(payload.vigenciaDesde || current[0].vigenciaDesde),
      vigenciaHasta: normalizeText(payload.vigenciaHasta ?? current[0].vigenciaHasta ?? "") || null,
      updatedAt: new Date(),
    }).where(eq(estatutosTable.id, id)).returning();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Error actualizando estatuto", detalle: String(err) });
  }
});

router.delete("/admin/nosotros/estatutos/:id", requireAuth, requireRole("directivo", "administrador"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "id inválido" });
    return;
  }
  try {
    const deleted = await db.delete(estatutosTable).where(eq(estatutosTable.id, id)).returning();
    if (!deleted.length) {
      res.status(404).json({ error: "Estatuto no encontrado" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error eliminando estatuto", detalle: String(err) });
  }
});

router.post("/admin/nosotros/actas", requireAuth, requireRole("directivo", "administrador"), async (req, res): Promise<void> => {
  const payload = req.body ?? {};
  const titulo = normalizeText(payload.titulo);
  const fechaActa = normalizeText(payload.fechaActa);
  if (!titulo || !fechaActa || !payload.pdfUrl) {
    res.status(400).json({ error: "titulo, fechaActa y pdfUrl son obligatorios" });
    return;
  }
  try {
    const pdfUrl = await persistPdfIfNeeded(payload.pdfUrl);
    if (!pdfUrl) {
      res.status(400).json({ error: "pdfUrl no válido" });
      return;
    }
    const [created] = await db.insert(actasAsambleaTable).values({
      titulo,
      tituloEu: normalizeText(payload.tituloEu) || null,
      pdfUrl,
      fechaActa,
      updatedAt: new Date(),
    }).returning();
    res.json(created);
  } catch (err) {
    res.status(500).json({ error: "Error creando acta", detalle: String(err) });
  }
});

router.put("/admin/nosotros/actas/:id", requireAuth, requireRole("directivo", "administrador"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "id inválido" });
    return;
  }
  const payload = req.body ?? {};
  try {
    const current = await db.select().from(actasAsambleaTable).where(eq(actasAsambleaTable.id, id)).limit(1);
    if (!current.length) {
      res.status(404).json({ error: "Acta no encontrada" });
      return;
    }
    const pdfUrl = payload.pdfUrl !== undefined
      ? await persistPdfIfNeeded(payload.pdfUrl)
      : current[0].pdfUrl;
    const [updated] = await db.update(actasAsambleaTable).set({
      titulo: normalizeText(payload.titulo || current[0].titulo),
      tituloEu: normalizeText(payload.tituloEu ?? current[0].tituloEu ?? "") || null,
      pdfUrl: pdfUrl || current[0].pdfUrl,
      fechaActa: normalizeText(payload.fechaActa || current[0].fechaActa),
      updatedAt: new Date(),
    }).where(eq(actasAsambleaTable.id, id)).returning();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Error actualizando acta", detalle: String(err) });
  }
});

router.delete("/admin/nosotros/actas/:id", requireAuth, requireRole("directivo", "administrador"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "id inválido" });
    return;
  }
  try {
    const deleted = await db.delete(actasAsambleaTable).where(eq(actasAsambleaTable.id, id)).returning();
    if (!deleted.length) {
      res.status(404).json({ error: "Acta no encontrada" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error eliminando acta", detalle: String(err) });
  }
});

router.put("/admin/roles/socios/:socioId", requireAuth, requireRole("administrador"), async (req, res): Promise<void> => {
  const socioId = Number(req.params.socioId);
  const role = normalizeText(req.body?.role).toLowerCase();
  const allowedRoles = new Set(["socio", "delegado", "directivo", "contable", "administrador"]);
  if (!Number.isFinite(socioId)) {
    res.status(400).json({ error: "socioId inválido" });
    return;
  }
  if (!allowedRoles.has(role)) {
    res.status(400).json({ error: "Rol inválido" });
    return;
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const [socio] = await db.select({
      id: sociosTable.id,
      odooId: sociosTable.odooId,
      email: sociosTable.email,
      nombre: sociosTable.nombre,
    }).from(sociosTable).where(eq(sociosTable.id, socioId)).limit(1);
    if (!socio) {
      res.status(404).json({ error: "Socio no encontrado" });
      return;
    }

    const [historicoRows, cargos] = await Promise.all([
      db.select().from(historicoCargosTable)
        .where(
          and(
            eq(historicoCargosTable.socioId, socioId),
            or(
              isNull(historicoCargosTable.fechaFin),
              gte(historicoCargosTable.fechaFin, today),
            ),
          ),
        ),
      db.select().from(cargosTable).where(eq(cargosTable.activo, 1)),
    ]);

    const cargoById = new Map<number, typeof cargosTable.$inferSelect>();
    for (const cargo of cargos) cargoById.set(cargo.id, cargo);

    const currentRoles = new Set<string>();
    for (const row of historicoRows) {
      const cargo = cargoById.get(row.cargoId);
      if (!cargo) continue;
      const codigo = normalizeText(cargo.codigo).toLowerCase();
      const nombre = normalizeText(cargo.nombre).toLowerCase();
      if (
        codigo.includes("tesorer") ||
        codigo.includes("contable") ||
        nombre.includes("tesorer") ||
        nombre.includes("contable")
      ) {
        currentRoles.add("contable");
      } else if (cargo.ambito === "directivo") {
        currentRoles.add("directivo");
      } else if (cargo.ambito === "delegado") {
        currentRoles.add("delegado");
      }
    }
    if (role !== "socio" && currentRoles.has(role)) {
      res.json({ ok: true, role, unchanged: true });
      return;
    }

    if (role === "socio") {
      res.json({ ok: true, role });
      return;
    }

    if (role === "administrador") {
      let updatedUsers = await db.update(usersTable).set({
        rol: "administrador",
        updatedAt: new Date(),
      }).where(eq(usersTable.socioId, socioId)).returning({ id: usersTable.id });
      if (updatedUsers.length === 0 && Number.isFinite(socio.odooId ?? NaN)) {
        updatedUsers = await db.update(usersTable).set({
          socioId,
          rol: "administrador",
          updatedAt: new Date(),
        }).where(eq(usersTable.odooUid, Number(socio.odooId))).returning({ id: usersTable.id });
      }
      if (updatedUsers.length === 0 && normalizeText(socio.email)) {
        updatedUsers = await db.update(usersTable).set({
          socioId,
          rol: "administrador",
          updatedAt: new Date(),
        }).where(ilike(usersTable.email, normalizeText(socio.email))).returning({ id: usersTable.id });
      }
      if (updatedUsers.length === 0) {
        const odooUid = Number.isFinite(socio.odooId ?? NaN)
          ? Number(socio.odooId)
          : -Math.max(1, socioId);
        const username = normalizeText(socio.email) || `socio_${socioId}`;
        const nombre = normalizeText(socio.nombre) || `Socio ${socioId}`;
        const [createdOrUpdated] = await db.insert(usersTable).values({
          odooUid,
          socioId,
          username,
          nombre,
          email: normalizeText(socio.email) || null,
          rol: "administrador",
          avatarUrl: null,
          ultimoAcceso: null,
          updatedAt: new Date(),
        }).onConflictDoUpdate({
          target: usersTable.odooUid,
          set: {
            socioId,
            username,
            nombre,
            email: normalizeText(socio.email) || null,
            rol: "administrador",
            updatedAt: new Date(),
          },
        }).returning({ id: usersTable.id });
        if (createdOrUpdated) updatedUsers = [createdOrUpdated];
      }
      if (updatedUsers.length === 0) {
        res.status(400).json({ error: "No se pudo crear o vincular un usuario para asignar administrador" });
        return;
      }
      res.json({ ok: true, role });
      return;
    }

    const selectedCargo = cargos.find((cargo) => {
      const codigo = normalizeText(cargo.codigo).toLowerCase();
      const nombre = normalizeText(cargo.nombre).toLowerCase();
      if (role === "contable") {
        return (
          codigo.includes("tesorer") ||
          codigo.includes("contable") ||
          nombre.includes("tesorer") ||
          nombre.includes("contable")
        );
      }
      if (role === "delegado") return cargo.ambito === "delegado";
      return cargo.ambito === "directivo";
    });

    if (!selectedCargo) {
      res.status(400).json({ error: "No hay cargo activo para el rol solicitado" });
      return;
    }

    await db.insert(historicoCargosTable).values({
      socioId,
      cargoId: selectedCargo.id,
      fechaInicio: today,
      fechaFin: null,
      descripcion: `Asignado por administrador (${role})`,
      descripcionEu: null,
    });

    res.json({ ok: true, role });
  } catch (err) {
    res.status(500).json({ error: "Error actualizando rol del socio", detalle: String(err) });
  }
});

router.get("/admin/roles/users", requireAuth, requireRole("administrador"), async (_req, res): Promise<void> => {
  try {
    const rows = await db
      .select({
        id: usersTable.id,
        socioId: usersTable.socioId,
        username: usersTable.username,
        nombre: usersTable.nombre,
        email: usersTable.email,
        rol: usersTable.rol,
        avatarUrl: usersTable.avatarUrl,
      })
      .from(usersTable)
      .orderBy(asc(usersTable.nombre), asc(usersTable.username));

    const users = rows.map((row) => {
      const fullName = normalizeText(row.nombre);
      const firstSpace = fullName.indexOf(" ");
      const nombre = firstSpace > 0 ? fullName.slice(0, firstSpace).trim() : fullName;
      const apellidos = firstSpace > 0 ? fullName.slice(firstSpace + 1).trim() : "";
      return {
        id: row.id,
        socioId: row.socioId,
        username: normalizeText(row.username),
        nombre,
        apellidos,
        email: normalizeText(row.email),
        rol: normalizeText(row.rol) || "usuario",
        avatarUrl: row.avatarUrl ?? null,
      };
    });

    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: "Error cargando usuarios para roles", detalle: String(err) });
  }
});

router.put("/admin/roles/users/:userId", requireAuth, requireRole("administrador"), async (req, res): Promise<void> => {
  const userId = Number(req.params.userId);
  const role = normalizeText(req.body?.role).toLowerCase();
  const allowedRoles = new Set(["usuario", "socio", "delegado", "directivo", "contable", "administrador"]);
  if (!Number.isFinite(userId)) {
    res.status(400).json({ error: "userId inválido" });
    return;
  }
  if (!allowedRoles.has(role)) {
    res.status(400).json({ error: "Rol inválido" });
    return;
  }

  try {
    const updated = await db.update(usersTable).set({
      rol: role,
      updatedAt: new Date(),
    }).where(eq(usersTable.id, userId)).returning({
      id: usersTable.id,
      rol: usersTable.rol,
    });
    if (updated.length === 0) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }
    res.json({ ok: true, user: updated[0] });
  } catch (err) {
    res.status(500).json({ error: "Error actualizando rol de usuario", detalle: String(err) });
  }
});

export default router;
