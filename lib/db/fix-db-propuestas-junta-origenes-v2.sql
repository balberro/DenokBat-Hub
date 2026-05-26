-- V2 de origenes de propuesta a la junta.
-- Original: sugerencia.
-- V2:       sugerencia | expediente | subvencion.
--
-- 'expediente' ya estaba siendo usado por el código (apertura desde un
-- expediente en curso) pero el constraint original no lo permitía, lo que
-- impedía insertar en BD con el check activo. Esta migración lo arregla.
-- 'subvencion' es el nuevo origen para las propuestas asociadas al flujo
-- de subvenciones (presentación inicial + cierre).
--
-- Idempotente: drop + create del check constraint.
-- Ejecutar como owner / superusuario.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_propuestas_junta_origen_tipo_chk'
      AND conrelid = 'db_propuestas_junta'::regclass
  ) THEN
    ALTER TABLE db_propuestas_junta DROP CONSTRAINT db_propuestas_junta_origen_tipo_chk;
  END IF;

  ALTER TABLE db_propuestas_junta
    ADD CONSTRAINT db_propuestas_junta_origen_tipo_chk
    CHECK (origen_tipo IN ('sugerencia', 'expediente', 'subvencion'));
END $$;

-- V2: solicitud concreta para propuestas de cierre de expediente.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_propuestas_junta_decision_chk'
      AND conrelid = 'db_propuestas_junta'::regclass
  ) THEN
    ALTER TABLE db_propuestas_junta DROP CONSTRAINT db_propuestas_junta_decision_chk;
  END IF;

  ALTER TABLE db_propuestas_junta
    ADD CONSTRAINT db_propuestas_junta_decision_chk
    CHECK (decision_solicitada IN (
      'rechazada',
      'mas_aportaciones',
      'abrir_expediente',
      'cerrar_expediente'
    ));
END $$;

-- V2: resultado de junta para cierre de expediente.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_propuestas_junta_resultado_chk'
      AND conrelid = 'db_propuestas_junta'::regclass
  ) THEN
    ALTER TABLE db_propuestas_junta DROP CONSTRAINT db_propuestas_junta_resultado_chk;
  END IF;

  ALTER TABLE db_propuestas_junta
    ADD CONSTRAINT db_propuestas_junta_resultado_chk
    CHECK (resultado IS NULL OR resultado IN (
      'rechazada',
      'mas_aportaciones',
      'expediente_abierto',
      'expediente_cerrado'
    ));
END $$;

-- V2: el estado 'borrador' ya forma parte del flujo actual de propuestas.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_propuestas_junta_estado_buzon_chk'
      AND conrelid = 'db_propuestas_junta'::regclass
  ) THEN
    ALTER TABLE db_propuestas_junta DROP CONSTRAINT db_propuestas_junta_estado_buzon_chk;
  END IF;

  ALTER TABLE db_propuestas_junta
    ADD CONSTRAINT db_propuestas_junta_estado_buzon_chk
    CHECK (estado_buzon IN ('borrador', 'pendiente', 'en_orden_dia', 'resuelta'));
END $$;

-- Índice único parcial para el nuevo origen 'subvencion': solo una propuesta
-- activa por expediente de subvención mientras está en borrador/pendiente/orden_dia.
DROP INDEX IF EXISTS db_propuestas_junta_subvencion_activa_uq;
CREATE UNIQUE INDEX db_propuestas_junta_subvencion_activa_uq
  ON db_propuestas_junta (origen_id)
  WHERE origen_tipo = 'subvencion'
    AND origen_id IS NOT NULL
    AND estado_buzon IN ('borrador', 'pendiente', 'en_orden_dia');
