-- Añade soporte para guardar el PDF justificante de un pago (rol delegado/contable).
-- Idempotente: se puede ejecutar varias veces.

BEGIN;

ALTER TABLE db_pagos
  ADD COLUMN IF NOT EXISTS justificante_url       text,
  ADD COLUMN IF NOT EXISTS justificante_subido_en timestamp,
  ADD COLUMN IF NOT EXISTS notas                  text;

-- Índice para consultas filtrando por pagos con/sin justificante.
CREATE INDEX IF NOT EXISTS idx_db_pagos_justificante
  ON db_pagos ((justificante_url IS NOT NULL));

COMMIT;
