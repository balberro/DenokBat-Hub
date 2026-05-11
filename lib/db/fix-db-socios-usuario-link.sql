-- Enlace explicito entre socio y usuario local.
ALTER TABLE db_socios
  ADD COLUMN IF NOT EXISTS usuario_id integer;

-- Un usuario solo puede estar vinculado a un socio.
CREATE UNIQUE INDEX IF NOT EXISTS db_socios_usuario_id_unique_idx
  ON db_socios (usuario_id)
  WHERE usuario_id IS NOT NULL;

-- FK defensiva (si no existe tabla/permiso owner puede fallar; ejecutar como owner).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'db_socios'
      AND constraint_name = 'db_socios_usuario_id_fkey'
  ) THEN
    ALTER TABLE db_socios
      ADD CONSTRAINT db_socios_usuario_id_fkey
      FOREIGN KEY (usuario_id) REFERENCES db_users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Backfill prioritario desde db_users.socio_id -> db_socios.usuario_id.
UPDATE db_socios s
SET usuario_id = u.id
FROM db_users u
WHERE u.socio_id = s.id
  AND s.usuario_id IS NULL;

-- Backfill inverso si hay socio vinculado por usuario_id y falta en db_users.
UPDATE db_users u
SET socio_id = s.id
FROM db_socios s
WHERE s.usuario_id = u.id
  AND u.socio_id IS NULL;
