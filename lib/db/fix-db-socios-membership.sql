-- Añade campos de membresía de Odoo en db_socios.
-- Ejecutar una sola vez en la base de datos del proyecto.

ALTER TABLE db_socios
  ADD COLUMN IF NOT EXISTS membership_estado VARCHAR(50),
  ADD COLUMN IF NOT EXISTS membership_desde DATE,
  ADD COLUMN IF NOT EXISTS membership_hasta DATE,
  ADD COLUMN IF NOT EXISTS membership_cuota NUMERIC(10,2);

