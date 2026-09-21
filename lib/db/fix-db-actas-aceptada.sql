-- Actas: nuevo estado 'aceptada' y PDF firmado en tabla aparte.
--
-- Flujo: borrador -> completa -> aceptada.
--   - 'completa': lista para firma (el acta se firma FUERA de la app y
--     permanece accesible mientras dura el proceso).
--   - 'aceptada': se ha subido el PDF firmado (documento externo).
--
-- El PDF firmado sale de db_actas (columnas pdf_*) y pasa a la tabla
-- db_actas_pdf (relación 1:1 con el acta). 'firmada' queda como estado legado
-- y se normaliza a 'aceptada'.
--
-- Idempotente; ejecutar como owner o superusuario.

-- 1) Tabla del PDF firmado (un único PDF por acta).
CREATE TABLE IF NOT EXISTS db_actas_pdf (
  id              SERIAL PRIMARY KEY,
  acta_id         INTEGER NOT NULL,
  pdf_url         TEXT NOT NULL,
  pdf_filename    TEXT,
  pdf_anyo_mes    VARCHAR(7),
  pdf_size        INTEGER,
  subido_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  subido_por      INTEGER,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_actas_pdf_acta_fkey'
      AND conrelid = 'db_actas_pdf'::regclass
  ) THEN
    ALTER TABLE db_actas_pdf
      ADD CONSTRAINT db_actas_pdf_acta_fkey
      FOREIGN KEY (acta_id) REFERENCES db_actas(id)
      ON DELETE CASCADE;
  END IF;

  -- Un solo PDF por acta (relación 1:1).
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_actas_pdf_acta_uq'
      AND conrelid = 'db_actas_pdf'::regclass
  ) THEN
    ALTER TABLE db_actas_pdf
      ADD CONSTRAINT db_actas_pdf_acta_uq UNIQUE (acta_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS db_actas_pdf_anyo_mes_idx
  ON db_actas_pdf (pdf_anyo_mes)
  WHERE pdf_anyo_mes IS NOT NULL;

-- 2) Migrar los PDFs existentes desde db_actas (columnas pdf_*), si las hay.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'db_actas' AND column_name = 'pdf_url'
  ) THEN
    INSERT INTO db_actas_pdf
      (acta_id, pdf_url, pdf_filename, pdf_anyo_mes, pdf_size, subido_en, subido_por)
    SELECT a.id, a.pdf_url, a.pdf_filename, a.pdf_anyo_mes, a.pdf_size,
           COALESCE(a.pdf_subido_en, now()), a.pdf_subido_por
      FROM db_actas a
     WHERE a.pdf_url IS NOT NULL
    ON CONFLICT (acta_id) DO NOTHING;
  END IF;
END $$;

-- 3) Normalizar el estado legado 'firmada' a 'aceptada'.
UPDATE db_actas SET estado = 'aceptada' WHERE estado = 'firmada';

-- 4) Actualizar el CHECK de estados a (borrador, completa, aceptada).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_actas_estado_chk'
      AND conrelid = 'db_actas'::regclass
  ) THEN
    ALTER TABLE db_actas DROP CONSTRAINT db_actas_estado_chk;
  END IF;
  ALTER TABLE db_actas
    ADD CONSTRAINT db_actas_estado_chk
    CHECK (estado IN ('borrador', 'completa', 'aceptada'));
END $$;
