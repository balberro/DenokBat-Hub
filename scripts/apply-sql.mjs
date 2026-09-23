#!/usr/bin/env node
/**
 * Aplica uno o varios ficheros .sql contra la base de datos indicada por la
 * variable de entorno DATABASE_URL. Sirve como alternativa a `psql` en
 * entornos donde el cliente PostgreSQL no está instalado (p. ej. el hosting).
 *
 * Uso:
 *   DATABASE_URL="postgres://user:pass@host:5432/db" \
 *     node scripts/apply-sql.mjs lib/db/fix-db-propuestas-junta.sql [...]
 *
 * O bien, cargando antes el entorno de test:
 *   set -a; source scripts/dinahosting-test.env.local; set +a
 *   node scripts/apply-sql.mjs lib/db/fix-db-propuestas-junta.sql
 *
 * Notas:
 *   - Cada fichero se ejecuta dentro de una transacción; si falla, se revierte.
 *   - Los scripts del repo son idempotentes (CREATE IF NOT EXISTS, etc.).
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

// `pg` vive en el workspace lib/db (monorepo pnpm); lo resolvemos desde ahí
// para que funcione sin depender de la raíz.
const requireFromDb = createRequire(resolve(repoRoot, "lib/db/package.json"));
const pg = requireFromDb("pg");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "ERROR: falta la variable DATABASE_URL.\n" +
      "Ejemplo:\n" +
      '  DATABASE_URL="postgres://user:pass@host:5432/db" node scripts/apply-sql.mjs <fichero.sql>\n' +
      "O carga el entorno de test:\n" +
      "  set -a; source scripts/dinahosting-test.env.local; set +a",
  );
  process.exit(1);
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("ERROR: indica al menos un fichero .sql. Ej: lib/db/fix-db-propuestas-junta.sql");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
try {
  await client.connect();
  // Muestra host/base (sin credenciales) para confirmar el destino.
  const { rows } = await client.query("SELECT current_database() AS db, inet_server_addr() AS host");
  console.log(`==> Conectado a la base "${rows[0].db}" (${rows[0].host ?? "local"})`);

  for (const f of files) {
    const abs = resolve(repoRoot, f);
    let sql;
    try {
      sql = await readFile(abs, "utf8");
    } catch (e) {
      console.error(`ERROR leyendo ${abs}: ${e.message}`);
      process.exitCode = 1;
      continue;
    }
    console.log(`==> Aplicando ${f} ...`);
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("COMMIT");
      console.log(`    OK`);
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      console.error(`    FALLO en ${f}: ${e.message}`);
      process.exitCode = 1;
    }
  }
} catch (e) {
  console.error(`ERROR de conexión: ${e.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
