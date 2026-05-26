-- Actas (V1).
-- Flujo: Convocatoria -> Acta -> Expediente.
-- Estados V1: 'borrador' | 'completa' | 'firmada'.
-- El acta se crea desde una convocatoria y copia sus puntos del orden del día.
-- Cada punto puede recoger acuerdo, resultado de propuesta y acción prevista
-- sobre expediente ('abrir' | 'continuar' | 'cerrar').
-- Ejecutar como owner / superusuario.

CREATE SEQUENCE IF NOT EXISTS db_actas_numero_seq;

CREATE TABLE IF NOT EXISTS db_actas (
  id                SERIAL PRIMARY KEY,
  numero            INTEGER UNIQUE,
  convocatoria_id   INTEGER,
  titulo            VARCHAR(500) NOT NULL,
  fecha             DATE,
  estado            VARCHAR(30) NOT NULL DEFAULT 'borrador',
  asistentes        TEXT,
  resumen           TEXT,
  observaciones     TEXT,
  completada_en     TIMESTAMPTZ,
  firmada_en        TIMESTAMPTZ,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
  creado_por        INTEGER
);

ALTER TABLE db_actas
  ADD COLUMN IF NOT EXISTS numero            INTEGER UNIQUE,
  ADD COLUMN IF NOT EXISTS convocatoria_id   INTEGER,
  ADD COLUMN IF NOT EXISTS titulo            VARCHAR(500),
  ADD COLUMN IF NOT EXISTS fecha             DATE,
  ADD COLUMN IF NOT EXISTS estado            VARCHAR(30) NOT NULL DEFAULT 'borrador',
  ADD COLUMN IF NOT EXISTS asistentes        TEXT,
  ADD COLUMN IF NOT EXISTS resumen           TEXT,
  ADD COLUMN IF NOT EXISTS observaciones     TEXT,
  ADD COLUMN IF NOT EXISTS completada_en     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS firmada_en        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS creado_por        INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_actas_estado_chk'
      AND conrelid = 'db_actas'::regclass
  ) THEN
    ALTER TABLE db_actas
      ADD CONSTRAINT db_actas_estado_chk
      CHECK (estado IN ('borrador', 'completa', 'firmada'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_actas_convocatoria_fkey'
      AND conrelid = 'db_actas'::regclass
  ) THEN
    ALTER TABLE db_actas
      ADD CONSTRAINT db_actas_convocatoria_fkey
      FOREIGN KEY (convocatoria_id) REFERENCES db_convocatorias(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_actas_convocatoria_uq'
      AND conrelid = 'db_actas'::regclass
  ) THEN
    ALTER TABLE db_actas
      ADD CONSTRAINT db_actas_convocatoria_uq UNIQUE (convocatoria_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS db_actas_estado_idx
  ON db_actas (estado, fecha DESC NULLS LAST, creado_en DESC);


CREATE TABLE IF NOT EXISTS db_acta_puntos (
  id                      SERIAL PRIMARY KEY,
  acta_id                 INTEGER NOT NULL,
  convocatoria_punto_id   INTEGER,
  orden                   INTEGER NOT NULL DEFAULT 0,
  propuesta_id            INTEGER,
  titulo                  VARCHAR(500),
  descripcion             TEXT,
  acuerdo                 TEXT,
  resultado_propuesta     VARCHAR(30),
  expediente_accion       VARCHAR(20),
  expediente_id           INTEGER,
  notas                   TEXT,
  creado_en               TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE db_acta_puntos
  ADD COLUMN IF NOT EXISTS acta_id                 INTEGER NOT NULL,
  ADD COLUMN IF NOT EXISTS convocatoria_punto_id   INTEGER,
  ADD COLUMN IF NOT EXISTS orden                   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS propuesta_id            INTEGER,
  ADD COLUMN IF NOT EXISTS titulo                  VARCHAR(500),
  ADD COLUMN IF NOT EXISTS descripcion             TEXT,
  ADD COLUMN IF NOT EXISTS acuerdo                 TEXT,
  ADD COLUMN IF NOT EXISTS resultado_propuesta     VARCHAR(30),
  ADD COLUMN IF NOT EXISTS expediente_accion       VARCHAR(20),
  ADD COLUMN IF NOT EXISTS expediente_id           INTEGER,
  ADD COLUMN IF NOT EXISTS notas                   TEXT,
  ADD COLUMN IF NOT EXISTS creado_en               TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS actualizado_en          TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_acta_puntos_acta_fkey'
      AND conrelid = 'db_acta_puntos'::regclass
  ) THEN
    ALTER TABLE db_acta_puntos
      ADD CONSTRAINT db_acta_puntos_acta_fkey
      FOREIGN KEY (acta_id) REFERENCES db_actas(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_acta_puntos_convocatoria_punto_fkey'
      AND conrelid = 'db_acta_puntos'::regclass
  ) THEN
    ALTER TABLE db_acta_puntos
      ADD CONSTRAINT db_acta_puntos_convocatoria_punto_fkey
      FOREIGN KEY (convocatoria_punto_id) REFERENCES db_convocatoria_puntos(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_acta_puntos_propuesta_fkey'
      AND conrelid = 'db_acta_puntos'::regclass
  ) THEN
    ALTER TABLE db_acta_puntos
      ADD CONSTRAINT db_acta_puntos_propuesta_fkey
      FOREIGN KEY (propuesta_id) REFERENCES db_propuestas_junta(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_acta_puntos_resultado_chk'
      AND conrelid = 'db_acta_puntos'::regclass
  ) THEN
    ALTER TABLE db_acta_puntos
      ADD CONSTRAINT db_acta_puntos_resultado_chk
      CHECK (
        resultado_propuesta IS NULL
        OR resultado_propuesta IN ('rechazada', 'mas_aportaciones', 'expediente_abierto')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_acta_puntos_expediente_accion_chk'
      AND conrelid = 'db_acta_puntos'::regclass
  ) THEN
    ALTER TABLE db_acta_puntos
      ADD CONSTRAINT db_acta_puntos_expediente_accion_chk
      CHECK (
        expediente_accion IS NULL
        OR expediente_accion IN ('abrir', 'continuar', 'cerrar')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS db_acta_puntos_acta_idx
  ON db_acta_puntos (acta_id, orden, id);

CREATE INDEX IF NOT EXISTS db_acta_puntos_propuesta_idx
  ON db_acta_puntos (propuesta_id)
  WHERE propuesta_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS db_acta_puntos_expediente_idx
  ON db_acta_puntos (expediente_id)
  WHERE expediente_id IS NOT NULL;
