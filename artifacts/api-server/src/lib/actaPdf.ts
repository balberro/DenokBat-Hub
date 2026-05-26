import { mkdir, writeFile, access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";

const MAX_BYTES = 25 * 1024 * 1024;

export type ActaPdfPersistResult = {
  url: string;
  filename: string;
  anyoMes: string;
  bytes: number;
  /**
   * Sufijo numérico aplicado por colisión con otros PDF del mismo mes
   * (0 = nombre limpio, 2 = `<slug>-2.pdf`, etc.).
   */
  suffix: number;
};

/**
 * Convierte el `titulo` de un acta a un slug seguro para nombre de archivo.
 * - Acentos eliminados, ASCII en minúsculas.
 * - Espacios y separadores convertidos en guiones simples.
 * - Trunca a 60 caracteres para no generar nombres absurdos.
 */
export function actaSlug(input: string): string {
  const base = (input ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "acta";
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/**
 * Calcula la clave `YYYY-MM` a partir de la fecha del acta o, si está vacía,
 * de la fecha actual. Aceptamos tanto `Date` como cadenas ISO o `YYYY-MM-DD`.
 */
export function anyoMesDe(fecha: Date | string | null | undefined): string {
  let d: Date;
  if (fecha instanceof Date) {
    d = fecha;
  } else if (typeof fecha === "string" && fecha.length > 0) {
    // Forzamos UTC para evitar saltos por zona horaria con dates `YYYY-MM-DD`.
    d = new Date(`${fecha.slice(0, 10)}T00:00:00Z`);
    if (isNaN(d.getTime())) d = new Date();
  } else {
    d = new Date();
  }
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
}

async function exists(p: string): Promise<boolean> {
  try {
    await access(p, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Guarda el PDF de un acta firmada en `uploads/actas/YYYY/MM/<slug>[-N].pdf`.
 *
 * - `pdfDataUrl` debe ser una cadena `data:application/pdf;base64,...`.
 * - `titulo` se convierte en slug; el nombre final incluye `anyoMes` al inicio
 *   para que la búsqueda alfabética coincida con el orden cronológico.
 * - Si ya existe un fichero con el mismo nombre base en ese mes, se añade un
 *   sufijo secuencial `-2`, `-3`, ... (ver `suffix` en el resultado).
 */
export async function persistActaPdf(args: {
  pdfDataUrl: string;
  fecha: Date | string | null | undefined;
  titulo: string;
}): Promise<ActaPdfPersistResult> {
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

  const anyoMes = anyoMesDe(args.fecha);
  const [anyo, mes] = anyoMes.split("-");
  const slug = actaSlug(args.titulo);
  const baseName = `${anyoMes}-${slug}`;
  const dir = path.resolve(
    process.cwd(),
    "artifacts/api-server/uploads/actas",
    anyo,
    mes,
  );
  await mkdir(dir, { recursive: true });

  let suffix = 0;
  let filename = `${baseName}.pdf`;
  let absPath = path.join(dir, filename);
  // Si colisiona, añadir `-N` empezando por 2 (`-bis` queda confuso si pasan a 3).
  while (await exists(absPath)) {
    suffix = suffix === 0 ? 2 : suffix + 1;
    filename = `${baseName}-${suffix}.pdf`;
    absPath = path.join(dir, filename);
  }

  await writeFile(absPath, buf);

  return {
    url: `/uploads/actas/${anyo}/${mes}/${filename}`,
    filename,
    anyoMes,
    bytes: buf.length,
    suffix,
  };
}
