-- Alinea db_articulos con el esquema actual (idempotente).
-- Ejecutar una sola vez en cada entorno:
--   psql "$DATABASE_URL" -f lib/db/fix-db-articulos.sql

ALTER TABLE IF EXISTS db_articulos
  ADD COLUMN IF NOT EXISTS titulo_eu varchar(255),
  ADD COLUMN IF NOT EXISTS categoria varchar(100) DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS fecha date,
  ADD COLUMN IF NOT EXISTS resumen text,
  ADD COLUMN IF NOT EXISTS resumen_eu text,
  ADD COLUMN IF NOT EXISTS contenido_eu text,
  ADD COLUMN IF NOT EXISTS imagenes_json text,
  ADD COLUMN IF NOT EXISTS publicado boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();

-- Normaliza filas antiguas para poder reforzar constraints sin romper.
UPDATE db_articulos
SET
  categoria = COALESCE(categoria, 'General'),
  fecha = COALESCE(fecha, CURRENT_DATE),
  publicado = COALESCE(publicado, true),
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now())
WHERE
  categoria IS NULL
  OR fecha IS NULL
  OR publicado IS NULL
  OR created_at IS NULL
  OR updated_at IS NULL;

-- Constraints esperadas por el schema Drizzle.
ALTER TABLE IF EXISTS db_articulos
  ALTER COLUMN titulo SET NOT NULL,
  ALTER COLUMN fecha SET NOT NULL,
  ALTER COLUMN contenido SET NOT NULL;
