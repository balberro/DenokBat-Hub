import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { noticiasTable } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import { odooCall } from "../lib/odoo";
import { requireAuth, requireRole } from "../middlewares/auth";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const router: IRouter = Router();
type NoticiaImagen = { src: string; side: "left" | "right"; anchorBlock: number };

function nullIfEmpty(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

function toSummary(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= 180 ? clean : `${clean.slice(0, 177)}...`;
}

function mapDbItem(n: typeof noticiasTable.$inferSelect) {
  let imagenes: NoticiaImagen[] = [];
  try {
    const parsed = n.imagenesJson ? JSON.parse(n.imagenesJson) as unknown[] : [];
    imagenes = Array.isArray(parsed)
      ? parsed
        .map((item) => {
          if (typeof item === "string") {
            const src = item.trim();
            if (!src || src === "[object Object]") return null;
            return { src, side: "right" as const, anchorBlock: 1 };
          }
          if (item && typeof item === "object") {
            const src = String((item as any).src ?? "").trim();
            if (!src || src === "[object Object]") return null;
            const side = (item as any).side === "left" ? "left" : "right";
            const rawAnchor = Number((item as any).anchorBlock);
            const anchorBlock = Number.isFinite(rawAnchor) && rawAnchor >= 1
              ? Math.floor(rawAnchor)
              : (Number.isFinite(rawAnchor) && rawAnchor === 0
                ? 1
                : ((item as any).position === "bottom" ? 9999 : (item as any).position === "middle" ? 2 : 1));
            return { src, side, anchorBlock };
          }
          return null;
        })
        .filter((img): img is NoticiaImagen => Boolean(img))
      : [];
  } catch {
    imagenes = [];
  }
  return {
    id: n.id,
    titulo: n.titulo,
    tituloEu: n.tituloEu,
    resumen: n.resumen,
    resumenEu: n.resumenEu,
    contenido: n.contenido,
    contenidoEu: n.contenidoEu,
    fecha: String(n.fecha),
    imagen: imagenes[0]?.src ?? null,
    imagenes,
    categoria: n.categoria,
    autor: "Directivo",
  };
}

function inferExtensionFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "bin";
}

async function persistImageDataUrlIfNeeded(value: string): Promise<string> {
  if (!value.startsWith("data:")) return value;
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return value;
  const mime = match[1];
  const base64 = match[2];
  const ext = inferExtensionFromMime(mime);
  const fileName = `noticia-${Date.now()}-${randomUUID()}.${ext}`;
  const uploadsDir = path.resolve(process.cwd(), "artifacts/api-server/uploads/noticias");
  await mkdir(uploadsDir, { recursive: true });
  const absPath = path.join(uploadsDir, fileName);
  await writeFile(absPath, Buffer.from(base64, "base64"));
  return `/uploads/noticias/${fileName}`;
}

async function persistNoticiaImages(raw: unknown): Promise<NoticiaImagen[]> {
  if (!Array.isArray(raw)) return [];
  const result: NoticiaImagen[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      const raw = item.trim();
      if (!raw || raw === "[object Object]") continue;
      const src = await persistImageDataUrlIfNeeded(raw);
      result.push({ src, side: "right", anchorBlock: 1 });
      continue;
    }
    if (item && typeof item === "object") {
      const srcRaw = String((item as any).src ?? "").trim();
      if (!srcRaw || srcRaw === "[object Object]") continue;
      const src = await persistImageDataUrlIfNeeded(srcRaw);
      const side = (item as any).side === "left" ? "left" : "right";
      const rawAnchor = Number((item as any).anchorBlock);
      const anchorBlock = Number.isFinite(rawAnchor) && rawAnchor >= 1
        ? Math.floor(rawAnchor)
        : (Number.isFinite(rawAnchor) && rawAnchor === 0
          ? 1
          : ((item as any).position === "bottom" ? 9999 : (item as any).position === "middle" ? 2 : 1));
      result.push({ src, side, anchorBlock });
    }
  }
  return result;
}

const MOCK_NOTICIAS = [
  { id: 1, titulo: "Nuevas actividades para la primavera 2026", tituloEu: "2026ko udaberriko jarduera berriak", resumen: "La asociación abre inscripciones para yoga, senderismo y talleres de cocina.", resumenEu: "Elkarteak yoga, mendizaletasun eta sukaldaritza tailerburu inskripzioak irekitzen ditu.", contenido: "<p>Este mes de abril, Denok Bat lanza un nuevo programa de actividades primavera-verano con más de 15 propuestas para todos los gustos.</p>", contenidoEu: null, fecha: "2026-03-20", imagen: null, categoria: "Actividades", autor: "Secretaría" },
  { id: 2, titulo: "Resultados de la asamblea anual", tituloEu: "Urteko batzarreko emaitzak", resumen: "Se aprobaron los presupuestos para 2026 y se renovó la junta directiva.", resumenEu: "2026rako aurrekontuak onartu ziren eta batzorde zuzendaritza berritu zen.", contenido: "<p>La asamblea general ordinaria de Denok Bat se celebró el pasado 15 de marzo con una asistencia récord de 340 socios.</p>", contenidoEu: null, fecha: "2026-03-17", imagen: null, categoria: "Institucional", autor: "Presidencia" },
  { id: 3, titulo: "Convenio con el centro de salud", tituloEu: "Hitzarmena osasun zentroarekin", resumen: "Nuevo acuerdo para ofrecer talleres de salud gratuitos a los socios.", resumenEu: "Hitzarmen berria bazkideei doako osasun tailerrak eskaintzeko.", contenido: "<p>Denok Bat ha firmado un convenio con el centro de salud municipal para ofrecer charlas mensuales sobre nutrición, movilidad y salud mental.</p>", contenidoEu: null, fecha: "2026-03-10", imagen: null, categoria: "Salud", autor: "Junta Directiva" },
];

router.get("/noticias", async (req, res): Promise<void> => {
  const { page = "1", limit = "10" } = req.query;
  const pageNum = parseInt(String(page), 10);
  const limitNum = parseInt(String(limit), 10);

  // 1) Local DB first (persistente)
  try {
    const rows = await db.select().from(noticiasTable).orderBy(desc(noticiasTable.fecha), desc(noticiasTable.id));
    if (rows.length > 0) {
      const start = (pageNum - 1) * limitNum;
      const items = rows.slice(start, start + limitNum).map(mapDbItem);
      res.json({ items, total: rows.length, page: pageNum, limit: limitNum });
      return;
    }
  } catch {
    // continue
  }

  try {
    const odooNews = (await odooCall("blog.post", "search_read", [
      [["website_published", "=", true]],
    ], {
      fields: ["name", "subtitle", "content", "post_date", "author_id", "tag_ids"],
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
      order: "post_date desc",
    })) as Record<string, unknown>[];

    if (odooNews && Array.isArray(odooNews) && odooNews.length > 0) {
      const items = odooNews.map((n) => ({
        id: Number(n.id),
        titulo: String(n.name ?? ""),
        tituloEu: null,
        resumen: n.subtitle ? String(n.subtitle) : null,
        resumenEu: null,
        contenido: n.content ? String(n.content) : null,
        contenidoEu: null,
        fecha: n.post_date ? String(n.post_date).split(" ")[0] : new Date().toISOString().split("T")[0],
        imagen: null,
        categoria: null,
        autor: n.author_id ? String((n.author_id as unknown[])[1] ?? "") : null,
      }));
      res.json({ items, total: items.length, page: pageNum, limit: limitNum });
      return;
    }
  } catch {
    // Usar mock
  }

  const start = (pageNum - 1) * limitNum;
  const paginated = MOCK_NOTICIAS.slice(start, start + limitNum);
  res.json({ items: paginated, total: MOCK_NOTICIAS.length, page: pageNum, limit: limitNum });
});

router.get("/noticias/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  try {
    const [row] = await db.select().from(noticiasTable).where(eq(noticiasTable.id, id)).limit(1);
    if (row) {
      res.json(mapDbItem(row));
      return;
    }
  } catch {
    // fallback mock
  }

  const found = MOCK_NOTICIAS.find((n) => n.id === id);
  if (!found) {
    res.status(404).json({ error: "Noticia no encontrada" });
    return;
  }
  res.json(found);
});

router.post("/noticias", requireAuth, requireRole("directivo", "administrador"), async (req, res): Promise<void> => {
  const body = req.body ?? {};
  if (!body.titulo || !body.contenido) {
    res.status(400).json({ error: "titulo y contenido son obligatorios" });
    return;
  }
  try {
    const now = new Date().toISOString().slice(0, 10);
    const persisted = await persistNoticiaImages(body.imagenes);
    const contenido = String(body.contenido);
    const contenidoEu = nullIfEmpty(body.contenidoEu) ?? contenido;
    const [inserted] = await db.insert(noticiasTable).values({
      titulo: String(body.titulo).trim(),
      tituloEu: nullIfEmpty(body.tituloEu),
      categoria: nullIfEmpty(body.categoria) ?? "General",
      fecha: String(body.fecha ?? now),
      resumen: toSummary(contenido),
      resumenEu: toSummary(contenidoEu),
      contenido,
      contenidoEu,
      imagenesJson: JSON.stringify(persisted),
      publicado: true,
    }).returning();
    res.status(201).json(mapDbItem(inserted));
  } catch (err) {
    res.status(500).json({ error: "Error creando noticia", detalle: String(err) });
  }
});

router.put("/noticias/:id", requireAuth, requireRole("directivo", "administrador"), async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "ID invalido" });
    return;
  }
  const body = req.body ?? {};
  try {
    const fields: Record<string, unknown> = { updatedAt: new Date() };
    if (body.titulo !== undefined) fields.titulo = String(body.titulo).trim();
    if (body.tituloEu !== undefined) fields.tituloEu = nullIfEmpty(body.tituloEu);
    if (body.categoria !== undefined) fields.categoria = nullIfEmpty(body.categoria);
    if (body.fecha !== undefined) fields.fecha = String(body.fecha);
    if (body.contenido !== undefined) fields.contenido = String(body.contenido);
    if (body.contenidoEu !== undefined) fields.contenidoEu = nullIfEmpty(body.contenidoEu);
    if (body.resumen !== undefined) fields.resumen = nullIfEmpty(body.resumen);
    if (body.resumenEu !== undefined) fields.resumenEu = nullIfEmpty(body.resumenEu);
    if (Array.isArray(body.imagenes)) {
      const persisted = await persistNoticiaImages(body.imagenes);
      fields.imagenesJson = JSON.stringify(persisted);
    }

    await db.update(noticiasTable).set(fields).where(eq(noticiasTable.id, id));
    const [updated] = await db.select().from(noticiasTable).where(eq(noticiasTable.id, id)).limit(1);
    if (!updated) {
      res.status(404).json({ error: "Noticia no encontrada" });
      return;
    }
    res.json(mapDbItem(updated));
  } catch (err) {
    res.status(500).json({ error: "Error actualizando noticia", detalle: String(err) });
  }
});

export default router;
