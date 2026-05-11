-- Estructura base para usuarios locales con perfil completo.
ALTER TABLE db_users
  ADD COLUMN IF NOT EXISTS apellidos varchar(255),
  ADD COLUMN IF NOT EXISTS telefono varchar(50),
  ADD COLUMN IF NOT EXISTS password_hash text;

-- Backfill inicial desde nombre completo cuando apellidos este vacio.
UPDATE db_users
SET apellidos = NULLIF(trim(substring(nombre from position(' ' in nombre) + 1)), '')
WHERE (apellidos IS NULL OR trim(apellidos) = '')
  AND position(' ' in nombre) > 0;

-- Garantiza username unico (si ya existe indice/constraint no falla).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'db_users'
      AND indexname = 'db_users_username_unique_idx'
  ) THEN
    CREATE UNIQUE INDEX db_users_username_unique_idx ON db_users (username);
  END IF;
END $$;
