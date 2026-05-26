import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const MAX_BYTES = 12 * 1024 * 1024;

/** Guarda data URL de PDF (o imagen) bajo uploads/pagos/; devuelve URL pública o null. */
export async function persistJustificantePago(value: unknown): Promise<string | null> {
  const raw = value === undefined || value === null ? "" : String(value).trim();
  if (!raw) return null;
  if (!raw.startsWith("data:")) {
    // Si ya viene una URL servida (/uploads/...), la mantenemos.
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
  if (mime === "application/pdf") ext = "pdf";
  else if (mime === "image/png") ext = "png";
  else if (mime === "image/jpeg" || mime === "image/jpg") ext = "jpg";
  else if (mime === "image/webp") ext = "webp";
  else return null;

  const fileName = `pago-${Date.now()}-${randomUUID()}.${ext}`;
  const uploadsDir = path.resolve(process.cwd(), "artifacts/api-server/uploads/pagos");
  await mkdir(uploadsDir, { recursive: true });
  const absPath = path.join(uploadsDir, fileName);
  await writeFile(absPath, buf);
  return `/uploads/pagos/${fileName}`;
}
