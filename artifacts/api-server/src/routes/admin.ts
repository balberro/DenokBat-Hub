import { Router, type IRouter } from "express";
import { requireAuth, requireRole } from "../middlewares/auth";
import { pool } from "@workspace/db";

const router: IRouter = Router();

// ── POST /admin/db/query ──────────────────────────────────────────────────────
// Ejecuta una consulta SQL contra la BD local.
// Sólo accesible para el rol "administrador".
// Por defecto sólo permite SELECT. Con modo "write" permite INSERT/UPDATE/DELETE.
router.post("/admin/db/query", requireAuth, requireRole("administrador"), async (req, res): Promise<void> => {
  const { sql: rawSql, mode = "read" } = req.body ?? {};

  if (!rawSql || typeof rawSql !== "string") {
    res.status(400).json({ error: "Falta el parámetro 'sql'" });
    return;
  }

  const trimmed = rawSql.trim();

  // Safety: block dangerous DDL operations always
  const dangerousPatterns = /\b(DROP\s+TABLE|DROP\s+DATABASE|TRUNCATE|ALTER\s+TABLE|CREATE\s+TABLE|DROP\s+SCHEMA|DROP\s+INDEX|VACUUM|REINDEX)\b/i;
  if (dangerousPatterns.test(trimmed)) {
    res.status(400).json({ error: "Operación DDL no permitida (DROP, TRUNCATE, ALTER, CREATE TABLE, etc.)" });
    return;
  }

  // In read mode, only allow SELECT and EXPLAIN
  if (mode !== "write") {
    const isSelectOrExplain = /^\s*(SELECT|EXPLAIN|WITH\s)/i.test(trimmed);
    if (!isSelectOrExplain) {
      res.status(400).json({
        error: "En modo lectura sólo se permiten SELECT, EXPLAIN y WITH. Activa el modo escritura para INSERT/UPDATE/DELETE.",
      });
      return;
    }
  }

  try {
    const start = Date.now();
    const result = await pool.query(trimmed);
    const elapsed = Date.now() - start;

    res.json({
      rows: result.rows,
      rowCount: result.rowCount,
      fields: result.fields?.map(f => ({ name: f.name, dataTypeID: f.dataTypeID })) ?? [],
      command: result.command,
      elapsed,
    });
  } catch (err: any) {
    res.status(400).json({
      error: "Error en la consulta SQL",
      detalle: err.message ?? String(err),
    });
  }
});

// ── GET /admin/db/tables ──────────────────────────────────────────────────────
// Lista todas las tablas con número de filas
router.get("/admin/db/tables", requireAuth, requireRole("administrador"), async (_req, res): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT
        t.table_name AS name,
        s.n_live_tup::int AS row_count
      FROM information_schema.tables t
      LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name
    `);
    res.json({ tables: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Error consultando tablas", detalle: String(err) });
  }
});

// ── GET /admin/db/table/:name ─────────────────────────────────────────────────
// Describe las columnas de una tabla
router.get("/admin/db/table/:name", requireAuth, requireRole("administrador"), async (req, res): Promise<void> => {
  const name = req.params.name.replace(/[^a-z0-9_]/gi, "");
  try {
    const result = await pool.query(`
      SELECT
        column_name AS name,
        data_type   AS type,
        is_nullable AS nullable,
        column_default AS default_val
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [name]);
    res.json({ columns: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Error describiendo tabla", detalle: String(err) });
  }
});

export default router;
