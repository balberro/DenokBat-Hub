import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const router: IRouter = Router();

function nullIfEmpty(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

function inferExtensionFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "bin";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

async function persistImageIfNeeded(value: unknown, folder: string): Promise<string | null> {
  const url = nullIfEmpty(value);
  if (!url) return null;
  if (!url.startsWith("data:")) return url;
  const match = url.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return url;
  const mime = match[1];
  const base64 = match[2];
  const ext = inferExtensionFromMime(mime);
  const fileName = `foto-${Date.now()}-${randomUUID()}.${ext}`;
  const uploadsDir = path.resolve(process.cwd(), "artifacts/api-server/uploads/galeria", folder);
  await mkdir(uploadsDir, { recursive: true });
  const absPath = path.join(uploadsDir, fileName);
  await writeFile(absPath, Buffer.from(base64, "base64"));
  return `/uploads/galeria/${folder}/${fileName}`;
}

function toIsoDateFromLegacy(anio: unknown, mes: unknown): string {
  const y = Number(anio);
  const m = Number(mes);
  if (Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12) {
    return `${y}-${String(m).padStart(2, "0")}-01`;
  }
  return new Date().toISOString().slice(0, 10);
}

function mapGaleriaRecord(row: Record<string, unknown>) {
  const legacyMeta = (() => {
    const raw = nullIfEmpty(row.descripcion);
    if (!raw) return {} as Record<string, unknown>;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  })();
  return {
    id: Number(row.id),
    titulo: String(row.titulo ?? ""),
    tituloEu: String(row.titulo_eu ?? row.titulo ?? ""),
    fecha: String(row.fecha ?? legacyMeta.fecha ?? toIsoDateFromLegacy(row.anio, row.mes)),
    tema: String(row.tema ?? "Evento"),
    mediaUrl: String(row.media_url ?? row.imagen_url ?? ""),
    thumbUrl: String(row.thumb_url ?? row.miniatura_url ?? ""),
    tipoMedia: String(row.tipo_media ?? "foto"),
  };
}

async function getGaleriaColumns(): Promise<Set<string>> {
  const result = await db.execute(sql`
    select column_name
    from information_schema.columns
    where table_name = 'db_galeria'
  `);
  const rows = (result as { rows: Array<Record<string, unknown>> }).rows ?? [];
  return new Set(rows.map((r) => String(r.column_name)));
}

router.get("/galeria", async (_req, res): Promise<void> => {
  try {
    const result = await db.execute(sql`select * from db_galeria order by id desc`);
    const rows = (result as { rows: Array<Record<string, unknown>> }).rows ?? [];
    res.json({ items: rows.map(mapGaleriaRecord), total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Error listando galeria", detalle: String(err) });
  }
});

router.post("/galeria", requireAuth, requireRole("directivo", "administrador"), async (req, res): Promise<void> => {
  const body = req.body ?? {};
  if (!body.titulo || (!body.mediaUrl && !Array.isArray(body.mediaUrls))) {
    res.status(400).json({ error: "titulo y mediaUrl/mediaUrls son obligatorios" });
    return;
  }
  try {
    const titulo = String(body.titulo).trim();
    const tituloEu = nullIfEmpty(body.tituloEu);
    const fecha = String(body.fecha ?? new Date().toISOString().slice(0, 10));
    const tema = nullIfEmpty(body.tema) ?? "Evento";
    const folder = `${slugify(tema)}-${fecha}-${slugify(titulo) || "album"}`;
    const incoming = Array.isArray(body.mediaUrls)
      ? body.mediaUrls
      : (body.mediaUrl ? [body.mediaUrl] : []);
    const persistedUrls = (
      await Promise.all(incoming.map((entry) => persistImageIfNeeded(entry, folder)))
    ).filter((u): u is string => Boolean(u));
    if (persistedUrls.length === 0) {
      res.status(400).json({ error: "mediaUrl o mediaUrls es obligatorio" });
      return;
    }
    const columns = await getGaleriaColumns();
    const isLegacy = columns.has("imagen_url") && !columns.has("fecha");
    const thumbUrl = await persistImageIfNeeded(body.thumbUrl, folder);
    if (isLegacy) {
      const d = new Date(fecha);
      const anio = Number.isFinite(d.getTime()) ? d.getUTCFullYear() : new Date().getUTCFullYear();
      const mes = Number.isFinite(d.getTime()) ? d.getUTCMonth() + 1 : new Date().getUTCMonth() + 1;
      const createdRows: Record<string, unknown>[] = [];
      for (const mediaUrl of persistedUrls) {
        const metadata = JSON.stringify({ fecha, folder });
        const inserted = await db.execute(sql`
          insert into db_galeria (titulo, titulo_eu, descripcion, imagen_url, miniatura_url, categoria, tema, anio, mes, created_at)
          values (${titulo}, ${tituloEu}, ${metadata}, ${mediaUrl}, ${thumbUrl ?? mediaUrl}, ${"General"}, ${tema}, ${anio}, ${mes}, now())
          returning *
        `);
        const row = (inserted as { rows: Array<Record<string, unknown>> }).rows?.[0];
        if (row) createdRows.push(row);
      }
      const items = createdRows.map(mapGaleriaRecord);
      res.status(201).json({ item: items[0] ?? null, items, total: items.length, folder });
      return;
    }

    const createdRows: Record<string, unknown>[] = [];
    for (const mediaUrl of persistedUrls) {
      const inserted = await db.execute(sql`
        insert into db_galeria (titulo, titulo_eu, fecha, tema, media_url, thumb_url, tipo_media, publicado)
        values (${titulo}, ${tituloEu}, ${fecha}, ${tema}, ${mediaUrl}, ${thumbUrl}, ${nullIfEmpty(body.tipoMedia) ?? "foto"}, true)
        returning *
      `);
      const row = (inserted as { rows: Array<Record<string, unknown>> }).rows?.[0];
      if (row) createdRows.push(row);
    }
    const items = createdRows.map(mapGaleriaRecord);
    res.status(201).json({ item: items[0] ?? null, items, total: items.length, folder });
  } catch (err) {
    res.status(500).json({ error: "Error creando item de galeria", detalle: String(err) });
  }
});

router.put("/galeria/:id", requireAuth, requireRole("directivo", "administrador"), async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "ID invalido" });
    return;
  }
  const body = req.body ?? {};
  try {
    const existingRes = await db.execute(sql`select * from db_galeria where id = ${id} limit 1`);
    const existing = (existingRes as { rows: Array<Record<string, unknown>> }).rows?.[0];
    if (!existing) {
      res.status(404).json({ error: "Item de galeria no encontrado" });
      return;
    }
    const columns = await getGaleriaColumns();
    const isLegacy = columns.has("imagen_url") && !columns.has("fecha");
    const titulo = body.titulo !== undefined ? String(body.titulo).trim() : String(existing.titulo ?? "");
    const tituloEu = body.tituloEu !== undefined ? nullIfEmpty(body.tituloEu) : nullIfEmpty(existing.titulo_eu);
    const fecha = body.fecha !== undefined ? String(body.fecha) : String(existing.fecha ?? toIsoDateFromLegacy(existing.anio, existing.mes));
    const tema = body.tema !== undefined ? (nullIfEmpty(body.tema) ?? "Evento") : String(existing.tema ?? "Evento");
    const folder = `${slugify(tema)}-${fecha}-${slugify(titulo) || "album"}`;
    const incomingAlbum = Array.isArray(body.mediaUrls) ? body.mediaUrls : [];
    const persistedAlbumUrls = (
      await Promise.all(incomingAlbum.map((entry) => persistImageIfNeeded(entry, folder)))
    ).filter((u): u is string => Boolean(u));
    const nextMediaUrl = body.mediaUrl !== undefined
      ? await persistImageIfNeeded(body.mediaUrl, folder)
      : (persistedAlbumUrls[0] ?? String(existing.media_url ?? existing.imagen_url ?? ""));
    const nextThumbUrl = body.thumbUrl !== undefined
      ? await persistImageIfNeeded(body.thumbUrl, folder)
      : String(existing.thumb_url ?? existing.miniatura_url ?? nextMediaUrl ?? "");

    if (isLegacy) {
      const d = new Date(fecha);
      const anio = Number.isFinite(d.getTime()) ? d.getUTCFullYear() : Number(existing.anio ?? new Date().getUTCFullYear());
      const mes = Number.isFinite(d.getTime()) ? d.getUTCMonth() + 1 : Number(existing.mes ?? (new Date().getUTCMonth() + 1));
      const metadata = JSON.stringify({ fecha, folder });
      const updated = await db.execute(sql`
        update db_galeria
        set titulo = ${titulo},
            titulo_eu = ${tituloEu},
            descripcion = ${metadata},
            imagen_url = ${nextMediaUrl},
            miniatura_url = ${nextThumbUrl},
            tema = ${tema},
            anio = ${anio},
            mes = ${mes}
        where id = ${id}
        returning *
      `);
      const row = (updated as { rows: Array<Record<string, unknown>> }).rows?.[0];
      const createdRows: Record<string, unknown>[] = [];
      for (let i = 1; i < persistedAlbumUrls.length; i += 1) {
        const inserted = await db.execute(sql`
          insert into db_galeria (titulo, titulo_eu, descripcion, imagen_url, miniatura_url, categoria, tema, anio, mes, created_at)
          values (${titulo}, ${tituloEu}, ${metadata}, ${persistedAlbumUrls[i]}, ${nextThumbUrl ?? persistedAlbumUrls[i]}, ${"General"}, ${tema}, ${anio}, ${mes}, now())
          returning *
        `);
        const extra = (inserted as { rows: Array<Record<string, unknown>> }).rows?.[0];
        if (extra) createdRows.push(extra);
      }
      res.json({ item: mapGaleriaRecord(row ?? {}), items: [mapGaleriaRecord(row ?? {}), ...createdRows.map(mapGaleriaRecord)] });
      return;
    }

    const updated = await db.execute(sql`
      update db_galeria
      set titulo = ${titulo},
          titulo_eu = ${tituloEu},
          fecha = ${fecha},
          tema = ${tema},
          media_url = ${nextMediaUrl},
          thumb_url = ${nextThumbUrl},
          tipo_media = ${nullIfEmpty(body.tipoMedia) ?? String(existing.tipo_media ?? "foto")},
          updated_at = now()
      where id = ${id}
      returning *
    `);
    const row = (updated as { rows: Array<Record<string, unknown>> }).rows?.[0];
    const createdRows: Record<string, unknown>[] = [];
    for (let i = 1; i < persistedAlbumUrls.length; i += 1) {
      const inserted = await db.execute(sql`
        insert into db_galeria (titulo, titulo_eu, fecha, tema, media_url, thumb_url, tipo_media, publicado)
        values (${titulo}, ${tituloEu}, ${fecha}, ${tema}, ${persistedAlbumUrls[i]}, ${nextThumbUrl ?? persistedAlbumUrls[i]}, ${nullIfEmpty(body.tipoMedia) ?? String(existing.tipo_media ?? "foto")}, true)
        returning *
      `);
      const extra = (inserted as { rows: Array<Record<string, unknown>> }).rows?.[0];
      if (extra) createdRows.push(extra);
    }
    res.json({ item: mapGaleriaRecord(row ?? {}), items: [mapGaleriaRecord(row ?? {}), ...createdRows.map(mapGaleriaRecord)] });
  } catch (err) {
    res.status(500).json({ error: "Error actualizando item de galeria", detalle: String(err) });
  }
});

export default router;
