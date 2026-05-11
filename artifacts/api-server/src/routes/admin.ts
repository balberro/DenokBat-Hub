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
    const client = await pool.connect();
    try {
      // Fuerza el esquema por defecto para consultas sin prefijo (p.ej. db_fiestas).
      await client.query("SET search_path TO public");
      const result = await client.query(trimmed);
      const elapsed = Date.now() - start;

      res.json({
        rows: result.rows,
        rowCount: result.rowCount,
        fields: result.fields?.map(f => ({ name: f.name, dataTypeID: f.dataTypeID })) ?? [],
        command: result.command,
        elapsed,
      });
    } finally {
      client.release();
    }
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

// ── POST /admin/db/bootstrap-nosotros ──────────────────────────────────────────
// Crea tablas y datos base para organigrama de "Nosotros" si no existen.
router.post("/admin/db/bootstrap-nosotros", requireAuth, requireRole("administrador"), async (_req, res): Promise<void> => {
  try {
    await pool.query(`
      BEGIN;

      CREATE TABLE IF NOT EXISTS db_cargos (
        id serial PRIMARY KEY,
        codigo varchar(100) NOT NULL UNIQUE,
        nombre varchar(255) NOT NULL,
        nombre_eu varchar(255),
        ambito varchar(30) NOT NULL DEFAULT 'directivo',
        activo integer NOT NULL DEFAULT 1,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS db_historico_cargos (
        id serial PRIMARY KEY,
        socio_id integer NOT NULL,
        cargo_id integer NOT NULL,
        fecha_inicio date NOT NULL,
        fecha_fin date,
        descripcion text,
        descripcion_eu text,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS db_estatutos (
        id serial PRIMARY KEY,
        titulo varchar(255) NOT NULL,
        titulo_eu varchar(255),
        pdf_url text NOT NULL,
        vigencia_desde date NOT NULL,
        vigencia_hasta date,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS db_actas_asamblea (
        id serial PRIMARY KEY,
        titulo varchar(255) NOT NULL,
        titulo_eu varchar(255),
        pdf_url text NOT NULL,
        fecha_acta date NOT NULL,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'db_historico_cargos_socio_fk'
        ) THEN
          BEGIN
            ALTER TABLE db_historico_cargos
              ADD CONSTRAINT db_historico_cargos_socio_fk
              FOREIGN KEY (socio_id) REFERENCES db_socios(id) ON DELETE CASCADE;
          EXCEPTION
            WHEN insufficient_privilege THEN
              -- Sin permiso REFERENCES sobre db_socios: se omite la FK.
              NULL;
          END;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'db_historico_cargos_cargo_fk'
        ) THEN
          BEGIN
            ALTER TABLE db_historico_cargos
              ADD CONSTRAINT db_historico_cargos_cargo_fk
              FOREIGN KEY (cargo_id) REFERENCES db_cargos(id) ON DELETE CASCADE;
          EXCEPTION
            WHEN insufficient_privilege THEN
              -- Sin permiso REFERENCES: se omite la FK.
              NULL;
          END;
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_db_cargos_ambito ON db_cargos(ambito);
      CREATE INDEX IF NOT EXISTS idx_db_cargos_activo ON db_cargos(activo);
      CREATE INDEX IF NOT EXISTS idx_db_historico_cargos_socio_id ON db_historico_cargos(socio_id);
      CREATE INDEX IF NOT EXISTS idx_db_historico_cargos_cargo_id ON db_historico_cargos(cargo_id);
      CREATE INDEX IF NOT EXISTS idx_db_historico_cargos_fecha_inicio ON db_historico_cargos(fecha_inicio);
      CREATE INDEX IF NOT EXISTS idx_db_historico_cargos_fecha_fin ON db_historico_cargos(fecha_fin);
      CREATE INDEX IF NOT EXISTS idx_db_estatutos_vigencia_desde ON db_estatutos(vigencia_desde);
      CREATE INDEX IF NOT EXISTS idx_db_estatutos_vigencia_hasta ON db_estatutos(vigencia_hasta);
      CREATE INDEX IF NOT EXISTS idx_db_actas_asamblea_fecha_acta ON db_actas_asamblea(fecha_acta);

      INSERT INTO db_cargos (codigo, nombre, nombre_eu, ambito, activo)
      VALUES
        ('fundador', 'Fundador/a', 'Sortzailea', 'fundador', 1),
        ('presidencia', 'Presidencia', 'Presidentzia', 'directivo', 1),
        ('vicepresidencia', 'Vicepresidencia', 'Presidenteordetza', 'directivo', 1),
        ('secretaria', 'Secretaria', 'Idazkaria', 'directivo', 1),
        ('tesoreria', 'Tesoreria', 'Diruzaintza', 'directivo', 1),
        ('vocal', 'Vocal', 'Bozeramailea', 'directivo', 1),
        ('delegado_zona', 'Delegado/a de zona', 'Zona ordezkaria', 'delegado', 1)
      ON CONFLICT (codigo) DO UPDATE
      SET
        nombre = EXCLUDED.nombre,
        nombre_eu = EXCLUDED.nombre_eu,
        ambito = EXCLUDED.ambito,
        activo = EXCLUDED.activo,
        updated_at = now();

      COMMIT;
    `);

    res.json({ ok: true, message: "Tablas de Nosotros creadas o actualizadas" });
  } catch (err) {
    await pool.query("ROLLBACK").catch(() => undefined);
    res.status(500).json({ error: "Error creando tablas de Nosotros", detalle: String(err) });
  }
});

export default router;
