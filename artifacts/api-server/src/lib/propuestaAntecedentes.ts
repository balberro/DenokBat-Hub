import { mkdir, writeFile, access, unlink } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { uploadsDir as uploadsRootDir, UPLOADS_ROOT } from "./storage";

const MAX_BYTES = 25 * 1024 * 1024;

export type AntecedentesPersistResult = {
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
    .slice(0, 50);
  return base || "antecedentes";
}

/**
 * Guarda un adjunto de antecedentes (PDF) en
 * `uploads/propuestas/<propuestaId>/<slug>-<uuid>.pdf`.
 *
 * Acepta `data:application/pdf;base64,...`. Tamaño máximo 25 MB.
 * El nombre original (si se proporciona) se usa para generar un slug
 * legible; el sufijo UUID evita colisiones.
 */
export async function persistAntecedentesPdf(args: {
  pdfDataUrl: string;
  propuestaId: number;
  originalName?: string | null;
}): Promise<AntecedentesPersistResult> {
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
  const slug = slugFilename(args.originalName ?? "antecedentes");
  const filename = `${slug}-${randomUUID().slice(0, 8)}.pdf`;
  const dir = uploadsRootDir("propuestas", String(args.propuestaId));
  await mkdir(dir, { recursive: true });
  const absPath = path.join(dir, filename);
  await writeFile(absPath, buf);
  return {
    url: `/uploads/propuestas/${args.propuestaId}/${filename}`,
    filename,
    bytes: buf.length,
  };
}

/**
 * Borra del disco un fichero servido bajo `/uploads/propuestas/...`. Se
 * resuelve la ruta absoluta a partir del propio path público y se valida
 * que esté dentro del directorio de uploads para evitar path traversal.
 */
export async function deleteAntecedentesFile(publicUrl: string): Promise<boolean> {
  if (!publicUrl) return false;
  const normalized = publicUrl.replace(/^\/+/, "");
  if (!normalized.startsWith("uploads/propuestas/")) return false;
  const absPath = path.resolve(UPLOADS_ROOT, normalized);
  const baseDir = uploadsRootDir("propuestas");
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
