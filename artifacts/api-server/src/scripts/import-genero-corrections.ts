import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@workspace/db";
import { sociosTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

type GenderNormalized = "H" | "F" | "N";

type CorrectionRow = {
  numeroSocio: string;
  genero: GenderNormalized;
};

function normalizeGenero(input: string): GenderNormalized | null {
  const raw = input.trim().toUpperCase();
  if (raw === "H") return "H";
  if (raw === "F") return "F";
  if (raw === "N") return "N";
  return null;
}

function parseCsvLine(line: string): string[] {
  // Parser CSV sencillo con soporte de comillas.
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === "\"") {
      if (inQuotes && line[i + 1] === "\"") {
        cur += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

function parseCsv(content: string): { rows: CorrectionRow[]; errors: string[] } {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { rows: [], errors: ["CSV vacío o sin datos"] };
  }

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const idxNumero = header.indexOf("numero_socio");
  const idxGenero = header.indexOf("genero_normalizado");
  const errors: string[] = [];
  const rows: CorrectionRow[] = [];

  if (idxNumero < 0 || idxGenero < 0) {
    return { rows, errors: ["Cabecera inválida. Se esperan columnas: numero_socio,genero_normalizado"] };
  }

  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    const numeroSocio = String(cols[idxNumero] ?? "").trim();
    const generoRaw = String(cols[idxGenero] ?? "").trim();
    const genero = normalizeGenero(generoRaw);
    if (!numeroSocio) {
      errors.push(`Línea ${i + 1}: numero_socio vacío`);
      continue;
    }
    if (!genero) {
      errors.push(`Línea ${i + 1}: genero_normalizado inválido (${generoRaw}). Usa H/F/N.`);
      continue;
    }
    rows.push({ numeroSocio, genero });
  }

  return { rows, errors };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const fileArg = args.find((a) => !a.startsWith("--"));
  const csvPath = fileArg
    ? path.resolve(process.cwd(), fileArg)
    : path.resolve(process.cwd(), "../../templates/socios_genero_correccion_template.csv");

  const raw = await readFile(csvPath, "utf8");
  const { rows, errors } = parseCsv(raw);

  if (errors.length > 0) {
    console.error("Errores de validación CSV:");
    for (const err of errors) console.error(`- ${err}`);
    process.exit(1);
  }

  let updated = 0;
  let notFound = 0;

  for (const row of rows) {
    const found = await db
      .select({ id: sociosTable.id })
      .from(sociosTable)
      .where(eq(sociosTable.numeroSocio, row.numeroSocio))
      .limit(1);

    if (found.length === 0) {
      notFound += 1;
      continue;
    }

    if (!dryRun) {
      await db
        .update(sociosTable)
        .set({ genero: row.genero, updatedAt: new Date() })
        .where(eq(sociosTable.numeroSocio, row.numeroSocio));
    }
    updated += 1;
  }

  console.log(`Filas leídas: ${rows.length}`);
  console.log(`Coincidencias encontradas: ${updated}`);
  console.log(`No encontradas: ${notFound}`);
  console.log(`Modo: ${dryRun ? "DRY-RUN (sin cambios)" : "APLICADO"}`);
}

void main().catch((err) => {
  console.error("Error importando correcciones de género:", err);
  process.exit(1);
});

