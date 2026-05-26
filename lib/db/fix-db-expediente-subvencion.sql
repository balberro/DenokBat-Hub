-- Extensión 1:1 de expedientes para la tipología 'subvenciones'.
--
-- Mantiene los metadatos económicos y administrativos específicos de una
-- subvención: organismo convocante, código de convocatoria, plazos clave,
-- importes (disponible, solicitado, concedido, justificado intermedio,
-- cobrado intermedio, justificado final, cobrado final) y `subestado` que
-- traza la fase concreta dentro del flujo:
--   preparando
--     → (la junta aprueba presentarse en acta) → aprobada_junta
--     → solicitud_enviada
--     → resuelta_concedida | resuelta_denegada
--     → en_ejecucion
--     → justif_intermedia_enviada → contestada_intermedia
--     → justif_final_enviada     → contestada_final
--     → propuesta_cierre
--     → (la junta aprueba cierre en acta) → expediente.estado='cerrado'
--
-- Las dos propuestas a la junta vinculadas se referencian con
-- `propuesta_inicial_id` y `propuesta_cierre_id`.
--
-- Idempotente. Ejecutar como owner / superusuario.

CREATE TABLE IF NOT EXISTS db_expediente_subvencion (
  expediente_id              INTEGER PRIMARY KEY,
  organismo                  VARCHAR(255),
  convocatoria_codigo        VARCHAR(255),
  plazo_solicitud            DATE,
  plazo_justif_intermedia    DATE,
  plazo_justif_final         DATE,
  importe_disponible         NUMERIC(14,2),
  importe_solicitado         NUMERIC(14,2),
  importe_concedido          NUMERIC(14,2),
  importe_justif_intermedio  NUMERIC(14,2),
  importe_cobrado_intermedio NUMERIC(14,2),
  importe_justif_final       NUMERIC(14,2),
  importe_cobrado_final      NUMERIC(14,2),
  subestado                  VARCHAR(40) NOT NULL DEFAULT 'preparando',
  propuesta_inicial_id       INTEGER,
  propuesta_cierre_id        INTEGER,
  creado_en                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en             TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE db_expediente_subvencion
  ADD COLUMN IF NOT EXISTS organismo                  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS convocatoria_codigo        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS plazo_solicitud            DATE,
  ADD COLUMN IF NOT EXISTS plazo_justif_intermedia    DATE,
  ADD COLUMN IF NOT EXISTS plazo_justif_final         DATE,
  ADD COLUMN IF NOT EXISTS importe_disponible         NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS importe_solicitado         NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS importe_concedido          NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS importe_justif_intermedio  NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS importe_cobrado_intermedio NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS importe_justif_final       NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS importe_cobrado_final      NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS subestado                  VARCHAR(40) NOT NULL DEFAULT 'preparando',
  ADD COLUMN IF NOT EXISTS propuesta_inicial_id       INTEGER,
  ADD COLUMN IF NOT EXISTS propuesta_cierre_id        INTEGER,
  ADD COLUMN IF NOT EXISTS creado_en                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS actualizado_en             TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_expediente_subvencion_subestado_chk'
      AND conrelid = 'db_expediente_subvencion'::regclass
  ) THEN
    ALTER TABLE db_expediente_subvencion
      ADD CONSTRAINT db_expediente_subvencion_subestado_chk
      CHECK (subestado IN (
        'preparando',
        'aprobada_junta',
        'solicitud_enviada',
        'resuelta_concedida',
        'resuelta_denegada',
        'en_ejecucion',
        'justif_intermedia_enviada',
        'contestada_intermedia',
        'justif_final_enviada',
        'contestada_final',
        'propuesta_cierre'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_expediente_subvencion_expediente_fkey'
      AND conrelid = 'db_expediente_subvencion'::regclass
  ) THEN
    ALTER TABLE db_expediente_subvencion
      ADD CONSTRAINT db_expediente_subvencion_expediente_fkey
      FOREIGN KEY (expediente_id) REFERENCES db_expedientes(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_expediente_subvencion_propuesta_inicial_fkey'
      AND conrelid = 'db_expediente_subvencion'::regclass
  ) THEN
    ALTER TABLE db_expediente_subvencion
      ADD CONSTRAINT db_expediente_subvencion_propuesta_inicial_fkey
      FOREIGN KEY (propuesta_inicial_id) REFERENCES db_propuestas_junta(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_expediente_subvencion_propuesta_cierre_fkey'
      AND conrelid = 'db_expediente_subvencion'::regclass
  ) THEN
    ALTER TABLE db_expediente_subvencion
      ADD CONSTRAINT db_expediente_subvencion_propuesta_cierre_fkey
      FOREIGN KEY (propuesta_cierre_id) REFERENCES db_propuestas_junta(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS db_expediente_subvencion_subestado_idx
  ON db_expediente_subvencion (subestado, actualizado_en DESC);
