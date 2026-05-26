-- Gestor de expedientes (V1).
-- Estados V1: 'en_curso' | 'cerrado'.
-- Acciones de junta: 'abrir' | 'continuar' | 'cerrar' (registradas en
-- db_expediente_movimientos). Abrir solo desde una propuesta a la junta
-- resuelta como 'expediente_abierto' (ver db_propuestas_junta).
-- Ejecutar como owner / superusuario.

CREATE SEQUENCE IF NOT EXISTS db_expedientes_numero_seq;

CREATE TABLE IF NOT EXISTS db_expedientes (
  id                SERIAL PRIMARY KEY,
  numero            INTEGER UNIQUE,
  denominacion      VARCHAR(500) NOT NULL,
  descripcion       TEXT NOT NULL,
  tipologia         VARCHAR(50) NOT NULL DEFAULT 'sugerencias',
  estado            VARCHAR(30) NOT NULL DEFAULT 'en_curso',
  propuesta_id      INTEGER UNIQUE,
  fecha_apertura    TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_cierre      TIMESTAMPTZ,
  observaciones     TEXT,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
  creado_por        INTEGER,
  cerrado_por       INTEGER
);

-- Idempotencia: columnas que pudieran faltar en una versión previa.
ALTER TABLE db_expedientes
  ADD COLUMN IF NOT EXISTS numero            INTEGER UNIQUE,
  ADD COLUMN IF NOT EXISTS denominacion      VARCHAR(500),
  ADD COLUMN IF NOT EXISTS descripcion       TEXT,
  ADD COLUMN IF NOT EXISTS tipologia         VARCHAR(50) NOT NULL DEFAULT 'sugerencias',
  ADD COLUMN IF NOT EXISTS estado            VARCHAR(30) NOT NULL DEFAULT 'en_curso',
  ADD COLUMN IF NOT EXISTS propuesta_id      INTEGER,
  ADD COLUMN IF NOT EXISTS fecha_apertura    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS fecha_cierre      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS observaciones     TEXT,
  ADD COLUMN IF NOT EXISTS creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS creado_por        INTEGER,
  ADD COLUMN IF NOT EXISTS cerrado_por       INTEGER;

-- Constraints y FK gestionadas dentro de un bloque DO para idempotencia.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_expedientes_estado_chk'
      AND conrelid = 'db_expedientes'::regclass
  ) THEN
    ALTER TABLE db_expedientes
      ADD CONSTRAINT db_expedientes_estado_chk
      CHECK (estado IN ('en_curso', 'cerrado'));
  END IF;

  -- Propuesta origen: si se borra la propuesta, dejamos el expediente
  -- preservando los datos (propuesta_id queda NULL).
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_expedientes_propuesta_fkey'
      AND conrelid = 'db_expedientes'::regclass
  ) THEN
    ALTER TABLE db_expedientes
      ADD CONSTRAINT db_expedientes_propuesta_fkey
      FOREIGN KEY (propuesta_id) REFERENCES db_propuestas_junta(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Índices para filtros típicos del listado.
CREATE INDEX IF NOT EXISTS db_expedientes_estado_idx
  ON db_expedientes (estado, creado_en DESC);
CREATE INDEX IF NOT EXISTS db_expedientes_tipologia_idx
  ON db_expedientes (tipologia);


-- Movimientos del expediente: cada acción de junta (abrir / continuar / cerrar).
CREATE TABLE IF NOT EXISTS db_expediente_movimientos (
  id              SERIAL PRIMARY KEY,
  expediente_id   INTEGER NOT NULL,
  tipo            VARCHAR(20) NOT NULL,
  acta_id         INTEGER,
  fecha           DATE NOT NULL DEFAULT (now()::date),
  autor_user_id   INTEGER,
  notas           TEXT,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE db_expediente_movimientos
  ADD COLUMN IF NOT EXISTS expediente_id   INTEGER NOT NULL,
  ADD COLUMN IF NOT EXISTS tipo            VARCHAR(20) NOT NULL,
  ADD COLUMN IF NOT EXISTS acta_id         INTEGER,
  ADD COLUMN IF NOT EXISTS fecha           DATE NOT NULL DEFAULT (now()::date),
  ADD COLUMN IF NOT EXISTS autor_user_id   INTEGER,
  ADD COLUMN IF NOT EXISTS notas           TEXT,
  ADD COLUMN IF NOT EXISTS creado_en       TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_expediente_movimientos_tipo_chk'
      AND conrelid = 'db_expediente_movimientos'::regclass
  ) THEN
    ALTER TABLE db_expediente_movimientos
      ADD CONSTRAINT db_expediente_movimientos_tipo_chk
      CHECK (tipo IN ('abrir', 'continuar', 'cerrar'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_expediente_movimientos_expediente_fkey'
      AND conrelid = 'db_expediente_movimientos'::regclass
  ) THEN
    ALTER TABLE db_expediente_movimientos
      ADD CONSTRAINT db_expediente_movimientos_expediente_fkey
      FOREIGN KEY (expediente_id) REFERENCES db_expedientes(id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS db_expediente_movimientos_expediente_idx
  ON db_expediente_movimientos (expediente_id, fecha DESC, id DESC);
CREATE INDEX IF NOT EXISTS db_expediente_movimientos_tipo_idx
  ON db_expediente_movimientos (tipo, fecha DESC);
