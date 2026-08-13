import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { hojasTable } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { uploadsDir as uploadsRootDir } from "../lib/storage";

const router: IRouter = Router();

function nullIfEmpty(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const str = String(value).trim();
  return str === "" ? null : str;
}

function errorDetail(err: unknown): string {
  const e = err as { message?: string; cause?: { message?: string; code?: string; detail?: string } };
  const parts: string[] = [];
  if (e?.message) parts.push(e.message);
  if (e?.cause?.message) parts.push(e.cause.message);
  if (e?.cause?.detail) parts.push(e.cause.detail);
  if (e?.cause?.code) parts.push(`PGCODE=${e.cause.code}`);
  return parts.join(" | ");
}

function inferExtensionFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  if (mime === "application/pdf") return "pdf";
  return "bin";
}

function parseYearMonth(input: unknown): { anio: number; mes: number } | null {
  const raw = nullIfEmpty(input);
  if (!raw) return null;
  const m = raw.match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  if (Number.isNaN(anio) || Number.isNaN(mes) || mes < 1 || mes > 12) return null;
  return { anio, mes };
}

function mapHojaRow(row: typeof hojasTable.$inferSelect) {
  const mm = String(row.mes ?? 1).padStart(2, "0");
  return {
    ...row,
    fecha: `${row.anio ?? new Date().getFullYear()}-${mm}-01`,
  };
}

async function persistDataUrlIfNeeded(value: unknown, kind: "foto" | "pdf"): Promise<string | null> {
  const url = nullIfEmpty(value);
  if (!url) return null;
  if (!url.startsWith("data:")) return url;

  const match = url.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return url;

  const mime = match[1];
  const base64 = match[2];
  const ext = inferExtensionFromMime(mime);
  const fileName = `${kind}-${Date.now()}-${randomUUID()}.${ext}`;
  const uploadsDir = uploadsRootDir("hojas");
  await mkdir(uploadsDir, { recursive: true });
  const absPath = path.join(uploadsDir, fileName);
  await writeFile(absPath, Buffer.from(base64, "base64"));
  return `/uploads/hojas/${fileName}`;
}

router.get("/hojas", async (_req, res): Promise<void> => {
  try {
    const rows = await db.select().from(hojasTable).orderBy(desc(hojasTable.anio), desc(hojasTable.mes), desc(hojasTable.id));
    res.json({ items: rows.map(mapHojaRow), total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Error listando hojas", detalle: errorDetail(err) });
  }
});

router.post("/hojas", requireAuth, requireRole("directivo", "administrador"), async (req, res): Promise<void> => {
  const body = req.body ?? {};
  const ym = parseYearMonth(body.fecha) ?? (
    body.anio !== undefined && body.mes !== undefined
      ? { anio: Number(body.anio), mes: Number(body.mes) }
      : null
  );
  if (!body.titulo || !ym || !body.fotoUrl || !body.pdfUrl) {
    res.status(400).json({ error: "titulo, fecha(anio-mes), fotoUrl y pdfUrl son obligatorios" });
    return;
  }
  try {
    const fotoUrl = await persistDataUrlIfNeeded(body.fotoUrl, "foto");
    const pdfUrl = await persistDataUrlIfNeeded(body.pdfUrl, "pdf");
    if (!fotoUrl || !pdfUrl) {
      res.status(400).json({ error: "fotoUrl y pdfUrl son obligatorios" });
      return;
    }
    const [inserted] = await db.insert(hojasTable).values({
      titulo: String(body.titulo).trim(),
      tituloEu: nullIfEmpty(body.tituloEu),
      anio: ym.anio,
      mes: ym.mes,
      descripcion: nullIfEmpty(body.descripcion),
      descripcionEu: nullIfEmpty(body.descripcionEu),
      fotoUrl,
      pdfUrl,
      estado: nullIfEmpty(body.estado) ?? "borrador",
    }).returning();
    res.status(201).json(mapHojaRow(inserted));
  } catch (err) {
    res.status(500).json({ error: "Error creando hoja", detalle: errorDetail(err) });
  }
});

router.put("/hojas/:id", requireAuth, requireRole("directivo", "administrador"), async (req, res): Promise<void> => {
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
    if (body.fecha !== undefined) {
      const ym = parseYearMonth(body.fecha);
      if (!ym) {
        res.status(400).json({ error: "fecha invalida, formato esperado YYYY-MM-DD" });
        return;
      }
      fields.anio = ym.anio;
      fields.mes = ym.mes;
    }
    if (body.anio !== undefined) fields.anio = Number(body.anio);
    if (body.mes !== undefined) fields.mes = Number(body.mes);
    if (body.descripcion !== undefined) fields.descripcion = nullIfEmpty(body.descripcion);
    if (body.descripcionEu !== undefined) fields.descripcionEu = nullIfEmpty(body.descripcionEu);
    if (body.fotoUrl !== undefined) fields.fotoUrl = await persistDataUrlIfNeeded(body.fotoUrl, "foto");
    if (body.pdfUrl !== undefined) fields.pdfUrl = await persistDataUrlIfNeeded(body.pdfUrl, "pdf");
    if (body.estado !== undefined) fields.estado = nullIfEmpty(body.estado);

    await db.update(hojasTable).set(fields).where(eq(hojasTable.id, id));
    const [updated] = await db.select().from(hojasTable).where(eq(hojasTable.id, id)).limit(1);
    if (!updated) {
      res.status(404).json({ error: "Hoja no encontrada" });
      return;
    }
    res.json(mapHojaRow(updated));
  } catch (err) {
    res.status(500).json({ error: "Error actualizando hoja", detalle: errorDetail(err) });
  }
});

export default router;
