-- Añade fecha de fallecimiento para socios
ALTER TABLE db_socios
ADD COLUMN IF NOT EXISTS fecha_fallecimiento date;
