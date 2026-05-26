-- Unifica los valores de db_socios.genero a un único conjunto de códigos:
--   M = Masculino  (en euskera se muestra como "G" — Gizonezkoak)
--   F = Femenino   (en euskera se muestra como "E" — Emakumezkoak)
--   N = Otros / no informado
-- Script idempotente: se puede ejecutar varias veces sin efectos secundarios.

BEGIN;

UPDATE db_socios
  SET genero = CASE upper(trim(genero))
    WHEN 'M'         THEN 'M'
    WHEN 'H'         THEN 'M'  -- "H" anterior (Hombre) → M
    WHEN 'MALE'      THEN 'M'
    WHEN 'HOMBRE'    THEN 'M'
    WHEN 'MASCULINO' THEN 'M'
    WHEN 'G'         THEN 'M'  -- "G" euskera (Gizonezkoak)
    WHEN 'GIZON'     THEN 'M'
    WHEN 'GIZONEZKOA' THEN 'M'
    WHEN 'F'         THEN 'F'
    WHEN 'FEMALE'    THEN 'F'
    WHEN 'MUJER'     THEN 'F'
    WHEN 'FEMENINO'  THEN 'F'
    WHEN 'E'         THEN 'F'  -- "E" euskera (Emakumezkoak)
    WHEN 'EMAKUME'   THEN 'F'
    WHEN 'EMAKUMEZKOA' THEN 'F'
    WHEN 'N'         THEN 'N'
    WHEN 'X'         THEN 'N'
    WHEN 'NB'        THEN 'N'
    WHEN 'OTHER'     THEN 'N'
    WHEN 'OTRO'      THEN 'N'
    WHEN ''          THEN NULL
    ELSE NULL
  END
WHERE genero IS NOT NULL
  AND (genero <> upper(trim(genero))
        OR upper(trim(genero)) NOT IN ('M','F','N'));

-- Comprobación: distinct y conteo final.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT genero, count(*) AS n FROM db_socios GROUP BY genero ORDER BY genero LOOP
    RAISE NOTICE 'genero=% n=%', r.genero, r.n;
  END LOOP;
END$$;

COMMIT;
