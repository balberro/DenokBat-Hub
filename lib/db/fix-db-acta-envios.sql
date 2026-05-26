-- Registro de envíos por email de un acta firmada.
-- Cada fila representa un envío hecho desde el módulo de actas.
-- Ejecutar como owner / superusuario.

CREATE TABLE IF NOT EXISTS db_acta_envios (
  id                SERIAL PRIMARY KEY,
  acta_id           INTEGER NOT NULL,
  enviado_por       INTEGER,
  enviado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
  asunto            TEXT NOT NULL,
  mensaje           TEXT,
  destinatarios     JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_destinos    INTEGER NOT NULL DEFAULT 0,
  ok                BOOLEAN NOT NULL DEFAULT true,
  error             TEXT
);

-- Idempotencia.
ALTER TABLE db_acta_envios
  ADD COLUMN IF NOT EXISTS acta_id        INTEGER NOT NULL,
  ADD COLUMN IF NOT EXISTS enviado_por    INTEGER,
  ADD COLUMN IF NOT EXISTS enviado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS asunto         TEXT,
  ADD COLUMN IF NOT EXISTS mensaje        TEXT,
  ADD COLUMN IF NOT EXISTS destinatarios  JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS total_destinos INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ok             BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS error          TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_acta_envios_acta_fkey'
      AND conrelid = 'db_acta_envios'::regclass
  ) THEN
    ALTER TABLE db_acta_envios
      ADD CONSTRAINT db_acta_envios_acta_fkey
      FOREIGN KEY (acta_id) REFERENCES db_actas(id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS db_acta_envios_acta_idx
  ON db_acta_envios (acta_id, enviado_en DESC);
