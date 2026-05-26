-- Antecedentes de la propuesta a la junta (V2 del buzón).
--
-- La propuesta pasa a tener tres campos editables principales:
--   * denominacion (título explicativo) — ya existía
--   * descripcion (objetivo, necesidad, pasos, beneficios) — ya existía;
--     en V2 se rellena con plantilla.
--   * decision_solicitada (solicitud concreta) — ya existía; en V2 el label
--     pasa a "Solicitud concreta" (no cambia el nombre interno).
--
-- Se añaden los **antecedentes**: texto largo y, opcionalmente, un PDF
-- adjunto. Los antecedentes se llevan al punto del orden del día de la
-- convocatoria, pero NO se copian al acta (el acta recoge la propuesta
-- "limpia": denominación, descripción y solicitud concreta).
--
-- Idempotente. Ejecutar como owner o superuser.

ALTER TABLE db_propuestas_junta
  ADD COLUMN IF NOT EXISTS antecedentes              TEXT,
  ADD COLUMN IF NOT EXISTS antecedentes_url          TEXT,
  ADD COLUMN IF NOT EXISTS antecedentes_filename     TEXT,
  ADD COLUMN IF NOT EXISTS antecedentes_size         INTEGER,
  ADD COLUMN IF NOT EXISTS antecedentes_subido_en    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS antecedentes_subido_por   INTEGER;

ALTER TABLE db_convocatoria_puntos
  ADD COLUMN IF NOT EXISTS antecedentes              TEXT,
  ADD COLUMN IF NOT EXISTS antecedentes_url          TEXT,
  ADD COLUMN IF NOT EXISTS antecedentes_filename     TEXT;

-- V2: incluir el nuevo estado `borrador` en los índices únicos parciales
-- que evitan tener dos propuestas activas de la misma sugerencia/expediente.
-- DROP + CREATE para que sea idempotente cuando ya existían los índices V1.
DROP INDEX IF EXISTS db_propuestas_junta_sugerencia_activa_uq;
CREATE UNIQUE INDEX db_propuestas_junta_sugerencia_activa_uq
  ON db_propuestas_junta (origen_id)
  WHERE origen_tipo = 'sugerencia'
    AND origen_id IS NOT NULL
    AND estado_buzon IN ('borrador', 'pendiente', 'en_orden_dia');

DROP INDEX IF EXISTS db_propuestas_junta_expediente_activa_uq;
CREATE UNIQUE INDEX db_propuestas_junta_expediente_activa_uq
  ON db_propuestas_junta (origen_id)
  WHERE origen_tipo = 'expediente'
    AND origen_id IS NOT NULL
    AND estado_buzon IN ('borrador', 'pendiente', 'en_orden_dia');
