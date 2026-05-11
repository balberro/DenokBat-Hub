-- Tipologia y estado normalizado para socios
ALTER TABLE db_socios
ADD COLUMN IF NOT EXISTS tipologia varchar(30) DEFAULT 'numeraria';

UPDATE db_socios
SET tipologia = CASE
  WHEN lower(coalesce(tipo_socio, '')) = 'honorifico' THEN 'honorifica'
  ELSE 'numeraria'
END
WHERE tipologia IS NULL OR tipologia = '';

UPDATE db_socios
SET estado = CASE
  WHEN lower(coalesce(estado, '')) IN ('baja', 'inactivo', 'inactive') THEN 'baja'
  WHEN lower(coalesce(estado, '')) IN ('activo', 'active') THEN 'activo'
  ELSE 'solicitante'
END;

ALTER TABLE db_socios
ALTER COLUMN tipologia SET DEFAULT 'numeraria';

ALTER TABLE db_socios
ALTER COLUMN estado SET DEFAULT 'solicitante';
