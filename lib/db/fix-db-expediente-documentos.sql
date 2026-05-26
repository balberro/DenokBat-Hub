-- Documentos adjuntos a expedientes (genérico, no solo subvenciones).
--
-- Cada expediente puede tener N documentos. El `tipo` es un texto libre con
-- valores conocidos por la aplicación. Para subvenciones se usan los tipos:
--   decreto | solicitud | resolucion | justif_intermedia |
--   contestacion_intermedia | justif_final | contestacion_final | otros
-- Para otras tipologías el `tipo` puede ser 'otros' o lo que la app decida.
--
-- Los ficheros se almacenan en disco bajo
--   uploads/expedientes/<expediente_id>/<filename>
-- y `url` apunta a ese fichero servido por la API.
--
-- Idempotente. Ejecutar como owner / superusuario.

CREATE TABLE IF NOT EXISTS db_expediente_documentos (
  id              SERIAL PRIMARY KEY,
  expediente_id   INTEGER NOT NULL,
  tipo            VARCHAR(40) NOT NULL DEFAULT 'otros',
  origen          VARCHAR(20) NOT NULL DEFAULT 'flujo',
  denominacion    VARCHAR(500),
  url             TEXT NOT NULL,
  filename        VARCHAR(255),
  size            INTEGER,
  fecha_documento DATE,
  importe         NUMERIC(14,2),
  notas           TEXT,
  subido_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  subido_por      INTEGER,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE db_expediente_documentos
  ADD COLUMN IF NOT EXISTS expediente_id   INTEGER NOT NULL,
  ADD COLUMN IF NOT EXISTS tipo            VARCHAR(40) NOT NULL DEFAULT 'otros',
  ADD COLUMN IF NOT EXISTS origen          VARCHAR(20) NOT NULL DEFAULT 'flujo',
  ADD COLUMN IF NOT EXISTS denominacion    VARCHAR(500),
  ADD COLUMN IF NOT EXISTS url             TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS filename        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS size            INTEGER,
  ADD COLUMN IF NOT EXISTS fecha_documento DATE,
  ADD COLUMN IF NOT EXISTS importe         NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS notas           TEXT,
  ADD COLUMN IF NOT EXISTS subido_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS subido_por      INTEGER,
  ADD COLUMN IF NOT EXISTS creado_en       TIMESTAMPTZ NOT NULL DEFAULT now();

-- Constraint origen: 'flujo' (subido durante el ciclo activo del expediente) o
-- 'historico' (subido a posteriori sobre cerrado/archivado, o en alta retroactiva).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_expediente_documentos_origen_chk'
      AND conrelid = 'db_expediente_documentos'::regclass
  ) THEN
    ALTER TABLE db_expediente_documentos
      DROP CONSTRAINT db_expediente_documentos_origen_chk;
  END IF;
END $$;

ALTER TABLE db_expediente_documentos
  ADD CONSTRAINT db_expediente_documentos_origen_chk
  CHECK (origen IN ('flujo', 'historico'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_expediente_documentos_expediente_fkey'
      AND conrelid = 'db_expediente_documentos'::regclass
  ) THEN
    ALTER TABLE db_expediente_documentos
      ADD CONSTRAINT db_expediente_documentos_expediente_fkey
      FOREIGN KEY (expediente_id) REFERENCES db_expedientes(id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS db_expediente_documentos_expediente_idx
  ON db_expediente_documentos (expediente_id, subido_en DESC);
CREATE INDEX IF NOT EXISTS db_expediente_documentos_tipo_idx
  ON db_expediente_documentos (tipo, subido_en DESC);
CREATE INDEX IF NOT EXISTS db_expediente_documentos_origen_idx
  ON db_expediente_documentos (origen, expediente_id);
