import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { uploadsDir as uploadsRootDir } from "./storage";

const MAX_BYTES = 12 * 1024 * 1024;

/** Guarda data URL de imagen o PDF bajo uploads/sugerencias/; devuelve URL pública o null. */
export async function persistSugerenciaAdjunto(value: unknown): Promise<string | null> {
  const raw = value === undefined || value === null ? "" : String(value).trim();
  if (!raw) return null;
  if (!raw.startsWith("data:")) {
    return raw.startsWith("/uploads/") ? raw : null;
  }

  const match = raw.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  const mime = match[1].toLowerCase();
  const base64 = match[2];
  let buf: Buffer;
  try {
    buf = Buffer.from(base64, "base64");
  } catch {
    return null;
  }
  if (buf.length === 0 || buf.length > MAX_BYTES) return null;

  let ext = "bin";
  if (mime === "image/png") ext = "png";
  else if (mime === "image/jpeg" || mime === "image/jpg") ext = "jpg";
  else if (mime === "image/webp") ext = "webp";
  else if (mime === "image/gif") ext = "gif";
  else if (mime === "application/pdf") ext = "pdf";
  else return null;

  const fileName = `sug-${Date.now()}-${randomUUID()}.${ext}`;
  const uploadsDir = uploadsRootDir("sugerencias");
  await mkdir(uploadsDir, { recursive: true });
  const absPath = path.join(uploadsDir, fileName);
  await writeFile(absPath, buf);
  return `/uploads/sugerencias/${fileName}`;
}
