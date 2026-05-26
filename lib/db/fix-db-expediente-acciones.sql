-- Acciones del expediente (V1).
-- Estados V1: 'pendiente' | 'hecha' | 'cancelada'.
-- Cada acción puede estar ligada a un movimiento concreto (abrir/continuar)
-- o ser creada manualmente desde la ficha del expediente (movimiento_id NULL).
-- Ejecutar como owner / superusuario.

CREATE TABLE IF NOT EXISTS db_expediente_acciones (
  id                    SERIAL PRIMARY KEY,
  expediente_id         INTEGER NOT NULL,
  movimiento_id         INTEGER,
  descripcion           TEXT NOT NULL,
  responsable_user_id   INTEGER,
  estado                VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  plazo                 DATE,
  observaciones         TEXT,
  completada_en         TIMESTAMPTZ,
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
  creado_por            INTEGER
);

-- Idempotencia.
ALTER TABLE db_expediente_acciones
  ADD COLUMN IF NOT EXISTS expediente_id         INTEGER NOT NULL,
  ADD COLUMN IF NOT EXISTS movimiento_id         INTEGER,
  ADD COLUMN IF NOT EXISTS descripcion           TEXT,
  ADD COLUMN IF NOT EXISTS responsable_user_id   INTEGER,
  ADD COLUMN IF NOT EXISTS estado                VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS plazo                 DATE,
  ADD COLUMN IF NOT EXISTS observaciones         TEXT,
  ADD COLUMN IF NOT EXISTS completada_en         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS creado_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS creado_por            INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_expediente_acciones_estado_chk'
      AND conrelid = 'db_expediente_acciones'::regclass
  ) THEN
    ALTER TABLE db_expediente_acciones
      ADD CONSTRAINT db_expediente_acciones_estado_chk
      CHECK (estado IN ('pendiente', 'hecha', 'cancelada'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_expediente_acciones_expediente_fkey'
      AND conrelid = 'db_expediente_acciones'::regclass
  ) THEN
    ALTER TABLE db_expediente_acciones
      ADD CONSTRAINT db_expediente_acciones_expediente_fkey
      FOREIGN KEY (expediente_id) REFERENCES db_expedientes(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_expediente_acciones_movimiento_fkey'
      AND conrelid = 'db_expediente_acciones'::regclass
  ) THEN
    ALTER TABLE db_expediente_acciones
      ADD CONSTRAINT db_expediente_acciones_movimiento_fkey
      FOREIGN KEY (movimiento_id) REFERENCES db_expediente_movimientos(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'db_expediente_acciones_responsable_fkey'
      AND conrelid = 'db_expediente_acciones'::regclass
  ) THEN
    ALTER TABLE db_expediente_acciones
      ADD CONSTRAINT db_expediente_acciones_responsable_fkey
      FOREIGN KEY (responsable_user_id) REFERENCES db_users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS db_expediente_acciones_expediente_idx
  ON db_expediente_acciones (expediente_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS db_expediente_acciones_responsable_idx
  ON db_expediente_acciones (responsable_user_id, estado);
CREATE INDEX IF NOT EXISTS db_expediente_acciones_estado_idx
  ON db_expediente_acciones (estado, plazo NULLS LAST);
