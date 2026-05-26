-- V2 de resultados de puntos de acta.
-- Se añade `expediente_cerrado` para propuestas de cierre de expediente,
-- especialmente en el ciclo de subvenciones.
--
-- Idempotente: drop + create del check constraint.
-- Ejecutar como owner / superusuario.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_acta_puntos_resultado_chk'
      AND conrelid = 'db_acta_puntos'::regclass
  ) THEN
    ALTER TABLE db_acta_puntos DROP CONSTRAINT db_acta_puntos_resultado_chk;
  END IF;

  ALTER TABLE db_acta_puntos
    ADD CONSTRAINT db_acta_puntos_resultado_chk
    CHECK (
      resultado_propuesta IS NULL
      OR resultado_propuesta IN (
        'rechazada',
        'mas_aportaciones',
        'expediente_abierto',
        'expediente_cerrado'
      )
    );
END $$;
