import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// PostgreSQL en hosting (p. ej. Dinahosting) puede usar certificado TLS autofirmado.
// Solo si lo indicas explícitamente: DATABASE_SSL_REJECT_UNAUTHORIZED=false
const connectionString = process.env.DATABASE_URL;
const relaxedSsl =
  process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "false";

export const pool = new Pool({
  connectionString,
  ...(relaxedSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});
export const db = drizzle(pool, { schema });

export * from "./schema";
