import { access, mkdir, unlink, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { uploadsDir as uploadsRootDir, UPLOADS_ROOT } from "./storage";

const MAX_BYTES = 25 * 1024 * 1024;

export type ExpedienteDocumentoPersistResult = {
  url: string;
  filename: string;
  bytes: number;
};

function slugFilename(input: string): string {
  const base = (input ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "documento";
}

/**
 * Guarda un PDF de expediente en:
 * `uploads/expedientes/<expedienteId>/<slug>-<uuid>.pdf`.
 *
 * Acepta `data:application/pdf;base64,...`. Tamaño máximo 25 MB.
 */
export async function persistExpedienteDocumentoPdf(args: {
  pdfDataUrl: string;
  expedienteId: number;
  originalName?: string | null;
}): Promise<ExpedienteDocumentoPersistResult> {
  const raw = (args.pdfDataUrl ?? "").trim();
  if (!raw.startsWith("data:application/pdf")) {
    throw new Error("Se esperaba un PDF en formato data URL (application/pdf).");
  }
  const match = raw.match(/^data:application\/pdf(?:;[^,]*)?;base64,(.+)$/);
  if (!match) {
    throw new Error("PDF en data URL con formato no reconocido.");
  }
  let buf: Buffer;
  try {
    buf = Buffer.from(match[1], "base64");
  } catch {
    throw new Error("No se pudo decodificar el contenido del PDF.");
  }
  if (buf.length === 0) {
    throw new Error("El PDF está vacío.");
  }
  if (buf.length > MAX_BYTES) {
    throw new Error(`El PDF supera el tamaño máximo de ${MAX_BYTES / (1024 * 1024)} MB.`);
  }

  const slug = slugFilename(args.originalName ?? "documento");
  const filename = `${slug}-${randomUUID().slice(0, 8)}.pdf`;
  const dir = uploadsRootDir("expedientes", String(args.expedienteId));
  await mkdir(dir, { recursive: true });
  const absPath = path.join(dir, filename);
  await writeFile(absPath, buf);
  return {
    url: `/uploads/expedientes/${args.expedienteId}/${filename}`,
    filename,
    bytes: buf.length,
  };
}

/**
 * Borra un fichero servido bajo `/uploads/expedientes/...`, validando que la
 * ruta real no salga del directorio permitido.
 */
export async function deleteExpedienteDocumentoFile(publicUrl: string): Promise<boolean> {
  if (!publicUrl) return false;
  const normalized = publicUrl.replace(/^\/+/, "");
  if (!normalized.startsWith("uploads/expedientes/")) return false;
  const absPath = path.resolve(UPLOADS_ROOT, normalized);
  const baseDir = uploadsRootDir("expedientes");
  if (!absPath.startsWith(baseDir + path.sep) && absPath !== baseDir) {
    return false;
  }
  try {
    await access(absPath, fsConstants.F_OK);
    await unlink(absPath);
    return true;
  } catch {
    return false;
  }
}
