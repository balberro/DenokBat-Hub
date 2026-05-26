-- Propuestas a la junta (buzón).
-- Origen V1: sugerencias. El paso de una sugerencia a estado 'presentada' va
-- atómicamente ligado a la creación de una fila en db_propuestas_junta.
-- Ejecutar como owner de la tabla / superusuario.

CREATE TABLE IF NOT EXISTS db_propuestas_junta (
  id                    SERIAL PRIMARY KEY,
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
  creado_por            INTEGER,
  origen_tipo           VARCHAR(40) NOT NULL DEFAULT 'sugerencia',
  origen_id             INTEGER,
  denominacion          VARCHAR(500) NOT NULL,
  descripcion           TEXT NOT NULL,
  decision_solicitada   VARCHAR(30) NOT NULL,
  estado_buzon          VARCHAR(30) NOT NULL DEFAULT 'pendiente',
  junta_id              INTEGER,
  resultado             VARCHAR(30),
  resuelta_en           TIMESTAMPTZ,
  expediente_id         INTEGER,
  observaciones         TEXT
);

-- Idempotencia: añadir columnas que falten si la tabla ya existía con una versión previa.
ALTER TABLE db_propuestas_junta
  ADD COLUMN IF NOT EXISTS creado_en           TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS creado_por          INTEGER,
  ADD COLUMN IF NOT EXISTS origen_tipo         VARCHAR(40) NOT NULL DEFAULT 'sugerencia',
  ADD COLUMN IF NOT EXISTS origen_id           INTEGER,
  ADD COLUMN IF NOT EXISTS denominacion        VARCHAR(500),
  ADD COLUMN IF NOT EXISTS descripcion         TEXT,
  ADD COLUMN IF NOT EXISTS decision_solicitada VARCHAR(30),
  ADD COLUMN IF NOT EXISTS estado_buzon        VARCHAR(30) NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS junta_id            INTEGER,
  ADD COLUMN IF NOT EXISTS resultado           VARCHAR(30),
  ADD COLUMN IF NOT EXISTS resuelta_en         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expediente_id       INTEGER,
  ADD COLUMN IF NOT EXISTS observaciones       TEXT;

-- Constraints de valor permitido. Se gestionan en bloque DO para mantener idempotencia.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_propuestas_junta_origen_tipo_chk'
      AND conrelid = 'db_propuestas_junta'::regclass
  ) THEN
    ALTER TABLE db_propuestas_junta
      ADD CONSTRAINT db_propuestas_junta_origen_tipo_chk
      CHECK (origen_tipo IN ('sugerencia'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_propuestas_junta_decision_chk'
      AND conrelid = 'db_propuestas_junta'::regclass
  ) THEN
    ALTER TABLE db_propuestas_junta
      ADD CONSTRAINT db_propuestas_junta_decision_chk
      CHECK (decision_solicitada IN ('rechazada', 'mas_aportaciones', 'abrir_expediente'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_propuestas_junta_estado_buzon_chk'
      AND conrelid = 'db_propuestas_junta'::regclass
  ) THEN
    ALTER TABLE db_propuestas_junta
      ADD CONSTRAINT db_propuestas_junta_estado_buzon_chk
      CHECK (estado_buzon IN ('pendiente', 'en_orden_dia', 'resuelta'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_propuestas_junta_resultado_chk'
      AND conrelid = 'db_propuestas_junta'::regclass
  ) THEN
    ALTER TABLE db_propuestas_junta
      ADD CONSTRAINT db_propuestas_junta_resultado_chk
      CHECK (resultado IS NULL OR resultado IN ('rechazada', 'mas_aportaciones', 'expediente_abierto'));
  END IF;

  -- FK opcional a la sugerencia origen (solo cuando origen_tipo = 'sugerencia');
  -- al borrar la sugerencia el origen_id queda NULL para preservar la propuesta como histórico.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_propuestas_junta_origen_sugerencia_fkey'
      AND conrelid = 'db_propuestas_junta'::regclass
  ) THEN
    ALTER TABLE db_propuestas_junta
      ADD CONSTRAINT db_propuestas_junta_origen_sugerencia_fkey
      FOREIGN KEY (origen_id) REFERENCES db_sugerencias(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Índices auxiliares para los filtros típicos del buzón.
CREATE INDEX IF NOT EXISTS db_propuestas_junta_estado_buzon_idx
  ON db_propuestas_junta (estado_buzon, creado_en DESC);

CREATE INDEX IF NOT EXISTS db_propuestas_junta_origen_idx
  ON db_propuestas_junta (origen_tipo, origen_id);

CREATE INDEX IF NOT EXISTS db_propuestas_junta_junta_idx
  ON db_propuestas_junta (junta_id)
  WHERE junta_id IS NOT NULL;

-- Sugerencias: única propuesta activa por sugerencia origen.
-- Permite re-presentar tras una resolución previa (filas en estado_buzon='resuelta').
CREATE UNIQUE INDEX IF NOT EXISTS db_propuestas_junta_sugerencia_activa_uq
  ON db_propuestas_junta (origen_id)
  WHERE origen_tipo = 'sugerencia'
    AND origen_id IS NOT NULL
    AND estado_buzon IN ('pendiente', 'en_orden_dia');
