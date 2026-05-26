-- Grupos de socios por poblaciones. Ejecutar como owner de la tabla / superusuario.

CREATE TABLE IF NOT EXISTS db_grupos (
  id           SERIAL PRIMARY KEY,
  nombre       VARCHAR(255) NOT NULL,
  nombre_eu    VARCHAR(255),
  delegado_id  INTEGER,
  poblaciones  TEXT[] NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE db_grupos
  ADD COLUMN IF NOT EXISTS nombre_eu    VARCHAR(255),
  ADD COLUMN IF NOT EXISTS delegado_id  INTEGER,
  ADD COLUMN IF NOT EXISTS poblaciones  TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT now();

-- El delegado del grupo es un socio, no un usuario web.
-- Corrige instalaciones previas donde `delegado_id` quedó referenciando db_users.
ALTER TABLE db_grupos
  DROP CONSTRAINT IF EXISTS db_grupos_delegado_id_fkey;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
    WHERE conname = 'db_grupos_delegado_id_socios_fkey'
      AND conrelid = 'db_grupos'::regclass
  ) THEN
    ALTER TABLE db_grupos
      ADD CONSTRAINT db_grupos_delegado_id_socios_fkey
      FOREIGN KEY (delegado_id) REFERENCES db_socios(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS db_grupos_poblaciones_gin
  ON db_grupos USING GIN (poblaciones);

-- Flag que marca asignaciones manuales (rol contable). Si está en TRUE,
-- la auto-asignación por poblaciones NO toca a ese socio.
ALTER TABLE db_socios
  ADD COLUMN IF NOT EXISTS grupo_manual BOOLEAN NOT NULL DEFAULT FALSE;

-- Back-fill: cada socio cuya `poblacion` esté en `poblaciones` de algún grupo,
-- queda asignado a ese grupo. NO sobrescribe asignaciones manuales.
-- Última escritura gana si una población aparece en varios.
UPDATE db_socios s
  SET grupo_id = g.id,
      updated_at = now()
  FROM db_grupos g
WHERE s.poblacion IS NOT NULL
  AND length(trim(s.poblacion)) > 0
  AND s.poblacion = ANY (g.poblaciones)
  AND (s.grupo_manual IS NOT TRUE)
  AND (s.grupo_id IS DISTINCT FROM g.id);
