-- Añade tipo de socio persistente y clasifica honoríficos (>= 85 años)
ALTER TABLE db_socios
ADD COLUMN IF NOT EXISTS tipo_socio varchar(30) DEFAULT 'ordinario';

UPDATE db_socios
SET tipo_socio = CASE
  WHEN fecha_nacimiento IS NOT NULL
       AND EXTRACT(YEAR FROM age(current_date, fecha_nacimiento)) >= 85
    THEN 'honorifico'
  ELSE 'ordinario'
END
WHERE tipo_socio IS NULL OR tipo_socio = '';

ALTER TABLE db_socios
ALTER COLUMN tipo_socio SET DEFAULT 'ordinario';
