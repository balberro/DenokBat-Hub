import path from "node:path";

/**
 * Raíz de los archivos subidos (imágenes, PDFs, avatares...).
 *
 * Se sirve públicamente bajo `/uploads/*`.
 *
 * Por defecto apunta a `artifacts/api-server/uploads` (relativa a la raíz del
 * repo), de modo que la ruta relativa es idéntica en desarrollo (local),
 * testeo y producción (hosting) y las URLs guardadas en BD (`/uploads/...`)
 * funcionan igual en los tres entornos.
 *
 * Si un entorno necesita otra ubicación, defínela con `UPLOADS_DIR`
 * (puede ser relativa al cwd o absoluta).
 */
export const UPLOADS_ROOT = process.env.UPLOADS_DIR
  ? path.resolve(process.cwd(), process.env.UPLOADS_DIR)
  : path.resolve(process.cwd(), "artifacts/api-server/uploads");

/** Devuelve la ruta absoluta de una subcarpeta/archivo dentro de uploads. */
export function uploadsDir(...parts: string[]): string {
  return path.join(UPLOADS_ROOT, ...parts);
}

/**
 * Valida que una ruta absoluta esté dentro del directorio de uploads
 * (protección frente a path traversal al borrar/listar archivos).
 */
export function isInsideUploads(absPath: string, subPath = ""): boolean {
  const baseDir = subPath ? path.join(UPLOADS_ROOT, subPath) : UPLOADS_ROOT;
  const resolved = path.resolve(absPath);
  return resolved === baseDir || resolved.startsWith(baseDir + path.sep);
}
