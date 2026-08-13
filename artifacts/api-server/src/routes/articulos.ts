import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { uploadsDir as uploadsRootDir } from "../lib/storage";

const router: IRouter = Router();

function nullIfEmpty(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

function inferExtensionFromMime(mime: string): string {
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "bin";
}

async function persistPdfIfNeeded(value: unknown): Promise<string | null> {
  const url = nullIfEmpty(value);
  if (!url) return null;
  if (!url.startsWith("data:")) return url;
  const match = url.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return url;
  const mime = match[1];
  const base64 = match[2];
  const ext = inferExtensionFromMime(mime);
  const fileName = `pdf-${Date.now()}-${randomUUID()}.${ext}`;
  const uploadsDir = uploadsRootDir("articulos");
  await mkdir(uploadsDir, { recursive: true });
  const absPath = path.join(uploadsDir, fileName);
  await writeFile(absPath, Buffer.from(base64, "base64"));
  return `/uploads/articulos/${fileName}`;
}

async function persistImageIfNeeded(value: unknown): Promise<string | null> {
  const url = nullIfEmpty(value);
  if (!url) return null;
  if (!url.startsWith("data:")) return url;
  const match = url.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return url;
  const mime = match[1];
  const base64 = match[2];
  const ext = inferExtensionFromMime(mime);
  const fileName = `foto-${Date.now()}-${randomUUID()}.${ext}`;
  const uploadsDir = uploadsRootDir("articulos");
  await mkdir(uploadsDir, { recursive: true });
  const absPath = path.join(uploadsDir, fileName);
  await writeFile(absPath, Buffer.from(base64, "base64"));
  return `/uploads/articulos/${fileName}`;
}

function parseImagenesJson(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

function mapArticuloRecord(row: Record<string, unknown>) {
  const hasNewSchema = Object.prototype.hasOwnProperty.call(row, "contenido");
  const legacyJson = nullIfEmpty(row.descripcion);
  const legacyExtra = parseImagenesJson(legacyJson);
  const extra = hasNewSchema
    ? parseImagenesJson(nullIfEmpty(row.imagenes_json))
    : legacyExtra;
  const fotoUrl = nullIfEmpty(extra.fotoUrl);
  const anio = Number(row.anio);
  const mes = Number(row.mes);
  const fechaLegacy = Number.isFinite(anio) && Number.isFinite(mes) && mes >= 1 && mes <= 12
    ? `${anio}-${String(mes).padStart(2, "0")}-01`
    : null;
  return {
    id: Number(row.id),
    titulo: String(row.titulo ?? ""),
    tituloEu: String(row.titulo_eu ?? row.titulo ?? ""),
    categoria: String(row.categoria ?? "General"),
    fecha: String(row.fecha ?? fechaLegacy ?? new Date().toISOString().slice(0, 10)),
    pdfUrlEs: String(row.contenido ?? row.pdf_url ?? legacyExtra.pdfUrlEs ?? ""),
    pdfUrlEu: String(row.contenido_eu ?? legacyExtra.pdfUrlEu ?? row.pdf_url ?? row.contenido ?? ""),
    fotoUrl,
  };
}

async function getArticulosColumns(): Promise<Set<string>> {
  const result = await db.execute(sql`
    select column_name
    from information_schema.columns
    where table_name = 'db_articulos'
  `);
  const rows = (result as { rows: Array<Record<string, unknown>> }).rows ?? [];
  return new Set(rows.map((r) => String(r.column_name)));
}

router.get("/articulos", async (_req, res): Promise<void> => {
  try {
    const result = await db.execute(sql`select * from db_articulos order by id desc`);
    const rows = (result as { rows: Array<Record<string, unknown>> }).rows ?? [];
    res.json({ items: rows.map(mapArticuloRecord), total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Error listando articulos", detalle: String(err) });
  }
});

router.post("/articulos", requireAuth, requireRole("directivo", "administrador"), async (req, res): Promise<void> => {
  const body = req.body ?? {};
  if (!body.titulo || !body.pdfUrlEs || !body.pdfUrlEu) {
    res.status(400).json({ error: "titulo, pdfUrlEs y pdfUrlEu son obligatorios" });
    return;
  }
  try {
    const pdfUrlEs = await persistPdfIfNeeded(body.pdfUrlEs);
    const pdfUrlEu = await persistPdfIfNeeded(body.pdfUrlEu);
    const fotoUrl = await persistImageIfNeeded(body.fotoUrl);
    if (!pdfUrlEs || !pdfUrlEu) {
      res.status(400).json({ error: "pdfUrlEs y pdfUrlEu son obligatorios" });
      return;
    }
    const imagenesJson = JSON.stringify({
      ...parseImagenesJson(nullIfEmpty(body.imagenesJson)),
      ...(fotoUrl ? { fotoUrl } : {}),
    });
    const titulo = String(body.titulo).trim();
    const tituloEu = nullIfEmpty(body.tituloEu);
    const categoria = nullIfEmpty(body.categoria) ?? "General";
    const fecha = String(body.fecha ?? new Date().toISOString().slice(0, 10));

    const columns = await getArticulosColumns();
    const isLegacy = columns.has("pdf_url") && !columns.has("contenido");
    if (isLegacy) {
      const d = new Date(fecha);
      const anio = Number.isFinite(d.getTime()) ? d.getUTCFullYear() : new Date().getUTCFullYear();
      const mes = Number.isFinite(d.getTime()) ? d.getUTCMonth() + 1 : new Date().getUTCMonth() + 1;
      const legacyPayload = JSON.stringify({
        ...(fotoUrl ? { fotoUrl } : {}),
        pdfUrlEs,
        pdfUrlEu,
      });
      const inserted = await db.execute(sql`
        insert into db_articulos (titulo, titulo_eu, pdf_url, descripcion, descripcion_eu, categoria, anio, mes, estado, created_at, updated_at)
        values (${titulo}, ${tituloEu}, ${pdfUrlEs}, ${legacyPayload}, ${legacyPayload}, ${categoria}, ${anio}, ${mes}, ${"publicado"}, now(), now())
        returning *
      `);
      const row = (inserted as { rows: Array<Record<string, unknown>> }).rows?.[0];
      res.status(201).json(mapArticuloRecord(row ?? {}));
      return;
    }

    // Esquema nuevo/intermedio.
    try {
      const inserted = await db.execute(sql`
        insert into db_articulos (titulo, titulo_eu, categoria, fecha, contenido, contenido_eu, imagenes_json, publicado)
        values (${titulo}, ${tituloEu}, ${categoria}, ${fecha}, ${pdfUrlEs}, ${pdfUrlEu}, ${imagenesJson}, true)
        returning id, titulo, titulo_eu, categoria, fecha, contenido, contenido_eu, imagenes_json
      `);
      const row = (inserted as { rows: Array<Record<string, unknown>> }).rows?.[0];
      const extra = parseImagenesJson(nullIfEmpty(row?.imagenes_json));
      res.status(201).json(mapArticuloRecord({
        ...row,
        titulo,
        titulo_eu: row?.titulo_eu ?? tituloEu,
        categoria,
        fecha,
        contenido: row?.contenido ?? pdfUrlEs,
        contenido_eu: row?.contenido_eu ?? pdfUrlEu,
        imagenes_json: JSON.stringify(extra),
      }));
      return;
    } catch {
      try {
        const inserted = await db.execute(sql`
          insert into db_articulos (titulo, titulo_eu, categoria, fecha, contenido, contenido_eu, publicado)
          values (${titulo}, ${tituloEu}, ${categoria}, ${fecha}, ${pdfUrlEs}, ${pdfUrlEu}, true)
          returning *
        `);
        const row = (inserted as { rows: Array<Record<string, unknown>> }).rows?.[0];
        res.status(201).json(mapArticuloRecord(row ?? {}));
        return;
      } catch {
        const d = new Date(fecha);
        const anio = Number.isFinite(d.getTime()) ? d.getUTCFullYear() : new Date().getUTCFullYear();
        const mes = Number.isFinite(d.getTime()) ? d.getUTCMonth() + 1 : new Date().getUTCMonth() + 1;
        const legacyPayload = JSON.stringify({
          ...(fotoUrl ? { fotoUrl } : {}),
          pdfUrlEs,
          pdfUrlEu,
        });
        const inserted = await db.execute(sql`
          insert into db_articulos (titulo, titulo_eu, pdf_url, descripcion, descripcion_eu, categoria, anio, mes, estado, created_at, updated_at)
          values (${titulo}, ${tituloEu}, ${pdfUrlEs}, ${legacyPayload}, ${legacyPayload}, ${categoria}, ${anio}, ${mes}, ${"publicado"}, now(), now())
          returning *
        `);
        const row = (inserted as { rows: Array<Record<string, unknown>> }).rows?.[0];
        res.status(201).json(mapArticuloRecord(row ?? {}));
        return;
      }
    }
  } catch (err) {
    res.status(500).json({ error: "Error creando articulo", detalle: String(err) });
  }
});

router.put("/articulos/:id", requireAuth, requireRole("directivo", "administrador"), async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "ID invalido" });
    return;
  }
  const body = req.body ?? {};
  try {
    const existingResult = await db.execute(sql`select * from db_articulos where id = ${id} limit 1`);
    const existing = (existingResult as { rows: Array<Record<string, unknown>> }).rows?.[0];
    if (!existing) {
      res.status(404).json({ error: "Articulo no encontrado" });
      return;
    }
    const titulo = body.titulo !== undefined ? String(body.titulo).trim() : String(existing.titulo ?? "");
    const tituloEu = body.tituloEu !== undefined ? nullIfEmpty(body.tituloEu) : nullIfEmpty(existing.titulo_eu);
    const categoria = body.categoria !== undefined ? (nullIfEmpty(body.categoria) ?? "General") : String(existing.categoria ?? "General");
    const fecha = body.fecha !== undefined ? String(body.fecha) : String(existing.fecha ?? `${existing.anio ?? new Date().getUTCFullYear()}-${String(existing.mes ?? 1).padStart(2, "0")}-01`);
    const pdfUrlEs = body.pdfUrlEs !== undefined ? await persistPdfIfNeeded(body.pdfUrlEs) : String(existing.contenido ?? existing.pdf_url ?? "");
    const pdfUrlEu = body.pdfUrlEu !== undefined ? await persistPdfIfNeeded(body.pdfUrlEu) : String(existing.contenido_eu ?? parseImagenesJson(nullIfEmpty(existing.descripcion)).pdfUrlEu ?? existing.pdf_url ?? "");
    const persistedFotoUrl = body.fotoUrl !== undefined ? await persistImageIfNeeded(body.fotoUrl) : null;

    try {
      const baseNew = parseImagenesJson(nullIfEmpty(existing.imagenes_json));
      const nextNew = {
        ...baseNew,
        ...parseImagenesJson(nullIfEmpty(body.imagenesJson)),
        ...(persistedFotoUrl !== null ? { fotoUrl: persistedFotoUrl } : {}),
      };
      const updated = await db.execute(sql`
        update db_articulos
        set titulo = ${titulo},
            titulo_eu = ${tituloEu},
            categoria = ${categoria},
            fecha = ${fecha},
            contenido = ${pdfUrlEs},
            contenido_eu = ${pdfUrlEu},
            imagenes_json = ${JSON.stringify(nextNew)},
            updated_at = now()
        where id = ${id}
        returning *
      `);
      const row = (updated as { rows: Array<Record<string, unknown>> }).rows?.[0];
      res.json(mapArticuloRecord(row ?? {}));
      return;
    } catch {
      const d = new Date(fecha);
      const anio = Number.isFinite(d.getTime()) ? d.getUTCFullYear() : Number(existing.anio ?? new Date().getUTCFullYear());
      const mes = Number.isFinite(d.getTime()) ? d.getUTCMonth() + 1 : Number(existing.mes ?? (new Date().getUTCMonth() + 1));
      const legacyBase = parseImagenesJson(nullIfEmpty(existing.descripcion));
      const legacyNext = {
        ...legacyBase,
        ...parseImagenesJson(nullIfEmpty(body.imagenesJson)),
        ...(persistedFotoUrl !== null ? { fotoUrl: persistedFotoUrl } : {}),
        pdfUrlEs,
        pdfUrlEu,
      };
      const updated = await db.execute(sql`
        update db_articulos
        set titulo = ${titulo},
            titulo_eu = ${tituloEu},
            categoria = ${categoria},
            pdf_url = ${pdfUrlEs},
            descripcion = ${JSON.stringify(legacyNext)},
            descripcion_eu = ${JSON.stringify(legacyNext)},
            anio = ${anio},
            mes = ${mes},
            updated_at = now()
        where id = ${id}
        returning *
      `);
      const row = (updated as { rows: Array<Record<string, unknown>> }).rows?.[0];
      res.json(mapArticuloRecord(row ?? {}));
      return;
    }
  } catch (err) {
    res.status(500).json({ error: "Error actualizando articulo", detalle: String(err) });
  }
});

export default router;
