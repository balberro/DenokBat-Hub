-- Convocatorias (V1).
-- Estados V1: 'borrador' | 'publicada' | 'celebrada'.
-- Tipos V1 (varchar libre, ampliable): 'junta_directiva', 'asamblea_general',
--   'delegados', 'otros'.
-- Orden del día: puntos en db_convocatoria_puntos. Un punto puede estar ligado a
--   una propuesta del buzón (db_propuestas_junta.id) o ser un punto libre con
--   título/descripción manual (saludo, varios, lectura del acta anterior, etc.).
-- La inclusión de una propuesta en el orden del día actualiza atómicamente la
--   propuesta a estado_buzon='en_orden_dia' y junta_id (gestionado por la API).
-- Ejecutar como owner / superusuario.

CREATE SEQUENCE IF NOT EXISTS db_convocatorias_numero_seq;

CREATE TABLE IF NOT EXISTS db_convocatorias (
  id                SERIAL PRIMARY KEY,
  numero            INTEGER UNIQUE,
  tipo              VARCHAR(40) NOT NULL DEFAULT 'junta_directiva',
  titulo            VARCHAR(500) NOT NULL,
  fecha             DATE,
  hora              VARCHAR(20),
  lugar             VARCHAR(500),
  estado            VARCHAR(30) NOT NULL DEFAULT 'borrador',
  observaciones     TEXT,
  publicada_en      TIMESTAMPTZ,
  celebrada_en      TIMESTAMPTZ,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
  creado_por        INTEGER
);

-- Idempotencia: columnas que pudieran faltar en una versión previa.
ALTER TABLE db_convocatorias
  ADD COLUMN IF NOT EXISTS numero            INTEGER UNIQUE,
  ADD COLUMN IF NOT EXISTS tipo              VARCHAR(40) NOT NULL DEFAULT 'junta_directiva',
  ADD COLUMN IF NOT EXISTS titulo            VARCHAR(500),
  ADD COLUMN IF NOT EXISTS fecha             DATE,
  ADD COLUMN IF NOT EXISTS hora              VARCHAR(20),
  ADD COLUMN IF NOT EXISTS lugar             VARCHAR(500),
  ADD COLUMN IF NOT EXISTS estado            VARCHAR(30) NOT NULL DEFAULT 'borrador',
  ADD COLUMN IF NOT EXISTS observaciones     TEXT,
  ADD COLUMN IF NOT EXISTS publicada_en      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS celebrada_en      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS creado_por        INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_convocatorias_estado_chk'
      AND conrelid = 'db_convocatorias'::regclass
  ) THEN
    ALTER TABLE db_convocatorias
      ADD CONSTRAINT db_convocatorias_estado_chk
      CHECK (estado IN ('borrador', 'publicada', 'celebrada'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS db_convocatorias_estado_idx
  ON db_convocatorias (estado, fecha DESC NULLS LAST, creado_en DESC);
CREATE INDEX IF NOT EXISTS db_convocatorias_tipo_idx
  ON db_convocatorias (tipo);


-- Puntos del orden del día.
-- Si propuesta_id no es NULL, el punto está ligado a una propuesta del buzón.
-- En ese caso título/descripción pueden quedar NULL (se renderizan desde la
-- propuesta) o usarse como notas adicionales del punto.
-- Si propuesta_id es NULL, es un punto libre (saludo, varios, lectura del acta
-- anterior, etc.); título obligatorio a nivel de aplicación.
CREATE TABLE IF NOT EXISTS db_convocatoria_puntos (
  id              SERIAL PRIMARY KEY,
  convocatoria_id INTEGER NOT NULL,
  orden           INTEGER NOT NULL DEFAULT 0,
  propuesta_id    INTEGER,
  titulo          VARCHAR(500),
  descripcion     TEXT,
  notas           TEXT,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE db_convocatoria_puntos
  ADD COLUMN IF NOT EXISTS convocatoria_id INTEGER NOT NULL,
  ADD COLUMN IF NOT EXISTS orden           INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS propuesta_id    INTEGER,
  ADD COLUMN IF NOT EXISTS titulo          VARCHAR(500),
  ADD COLUMN IF NOT EXISTS descripcion     TEXT,
  ADD COLUMN IF NOT EXISTS notas           TEXT,
  ADD COLUMN IF NOT EXISTS creado_en       TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
BEGIN
  -- FK a la convocatoria: borra puntos en cascada al borrar convocatoria.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_convocatoria_puntos_convocatoria_fkey'
      AND conrelid = 'db_convocatoria_puntos'::regclass
  ) THEN
    ALTER TABLE db_convocatoria_puntos
      ADD CONSTRAINT db_convocatoria_puntos_convocatoria_fkey
      FOREIGN KEY (convocatoria_id) REFERENCES db_convocatorias(id)
      ON DELETE CASCADE;
  END IF;

  -- FK opcional a la propuesta: si la propuesta se borra, el punto se preserva
  -- pero pierde el enlace.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_convocatoria_puntos_propuesta_fkey'
      AND conrelid = 'db_convocatoria_puntos'::regclass
  ) THEN
    ALTER TABLE db_convocatoria_puntos
      ADD CONSTRAINT db_convocatoria_puntos_propuesta_fkey
      FOREIGN KEY (propuesta_id) REFERENCES db_propuestas_junta(id)
      ON DELETE SET NULL;
  END IF;

  -- Coherencia: un punto debe tener propuesta_id o título no vacío (libre).
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_convocatoria_puntos_contenido_chk'
      AND conrelid = 'db_convocatoria_puntos'::regclass
  ) THEN
    ALTER TABLE db_convocatoria_puntos
      ADD CONSTRAINT db_convocatoria_puntos_contenido_chk
      CHECK (propuesta_id IS NOT NULL OR COALESCE(LENGTH(BTRIM(titulo)), 0) > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS db_convocatoria_puntos_convocatoria_idx
  ON db_convocatoria_puntos (convocatoria_id, orden, id);
CREATE INDEX IF NOT EXISTS db_convocatoria_puntos_propuesta_idx
  ON db_convocatoria_puntos (propuesta_id)
  WHERE propuesta_id IS NOT NULL;

-- Una propuesta solo puede estar en una convocatoria a la vez.
CREATE UNIQUE INDEX IF NOT EXISTS db_convocatoria_puntos_propuesta_uq
  ON db_convocatoria_puntos (propuesta_id)
  WHERE propuesta_id IS NOT NULL;
