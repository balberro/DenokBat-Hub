-- Desglosa direccion de socios para zonificacion por delegados
ALTER TABLE db_socios
ADD COLUMN IF NOT EXISTS poblacion varchar(255);

ALTER TABLE db_socios
ADD COLUMN IF NOT EXISTS provincia varchar(255);
