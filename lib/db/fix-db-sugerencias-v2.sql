-- Sugerencias v2: numeración pública, tema, estados, aportaciones (parent_id), adjuntos, expediente futuro.
-- Ejecutar como propietario de la tabla (el usuario de la app puede no tener ALTER).

CREATE SEQUENCE IF NOT EXISTS db_sugerencias_numero_seq;

ALTER TABLE db_sugerencias
  ADD COLUMN IF NOT EXISTS parent_id integer REFERENCES db_sugerencias(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS tema varchar(500),
  ADD COLUMN IF NOT EXISTS observaciones_estado text,
  ADD COLUMN IF NOT EXISTS alias_publicacion varchar(200),
  ADD COLUMN IF NOT EXISTS adjunto_url text,
  ADD COLUMN IF NOT EXISTS numero_sugerencia integer,
  ADD COLUMN IF NOT EXISTS fecha_entrada timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS expediente_id integer,
  ADD COLUMN IF NOT EXISTS nombre_remitente varchar(255),
  ADD COLUMN IF NOT EXISTS email_remitente varchar(255);

-- Raíces: tema desde categoría legada si hace falta
UPDATE db_sugerencias
SET tema = COALESCE(NULLIF(trim(tema), ''), NULLIF(trim(categoria), ''), 'Sin tema')
WHERE parent_id IS NULL AND (tema IS NULL OR trim(tema) = '');

-- Aportaciones sin tema (por si hay filas huérfanas de prueba)
UPDATE db_sugerencias s
SET tema = 'Aportación'
WHERE s.parent_id IS NOT NULL AND (s.tema IS NULL OR trim(s.tema) = '');

-- Estados: migrar pendiente → nueva
UPDATE db_sugerencias
SET estado = 'nueva'
WHERE estado IS NULL OR trim(estado) = '' OR lower(trim(estado)) = 'pendiente';

UPDATE db_sugerencias
SET fecha_entrada = COALESCE(fecha_entrada, created_at)
WHERE fecha_entrada IS NULL;

-- Numeración para filas raíz existentes
UPDATE db_sugerencias s
SET numero_sugerencia = sub.n
FROM (
  SELECT id, row_number() OVER (ORDER BY id) AS n
  FROM db_sugerencias
  WHERE parent_id IS NULL
) sub
WHERE s.id = sub.id AND s.parent_id IS NULL AND s.numero_sugerencia IS NULL;

SELECT setval(
  'db_sugerencias_numero_seq',
  GREATEST(
    1,
    COALESCE((SELECT MAX(numero_sugerencia) FROM db_sugerencias WHERE parent_id IS NULL), 0)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS db_sugerencias_numero_raiz_idx
  ON db_sugerencias (numero_sugerencia)
  WHERE parent_id IS NULL AND numero_sugerencia IS NOT NULL;
