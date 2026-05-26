-- V2 de estados de expediente.
-- Original: en_curso | cerrado.
-- V2:       en_curso | cerrado | preparando | archivado.
--
-- 'preparando' lo usa el rol contable para expedientes de
-- tipologia='subvenciones' mientras tramita el decreto y la junta aún no ha
-- aprobado presentarse. Al aprobarse en acta pasa a 'en_curso'.
-- Si la junta rechaza la presentación, el expediente queda 'archivado'.
--
-- Idempotente: drop + create del check constraint.
-- Ejecutar como owner / superusuario.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_expedientes_estado_chk'
      AND conrelid = 'db_expedientes'::regclass
  ) THEN
    ALTER TABLE db_expedientes DROP CONSTRAINT db_expedientes_estado_chk;
  END IF;

  ALTER TABLE db_expedientes
    ADD CONSTRAINT db_expedientes_estado_chk
    CHECK (estado IN ('en_curso', 'cerrado', 'preparando', 'archivado'));
END $$;
