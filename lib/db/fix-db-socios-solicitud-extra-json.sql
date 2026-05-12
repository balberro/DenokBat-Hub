-- Respuestas a campos extra definidos en asociacion.grupos_campos_json (solicitud de socio).
ALTER TABLE db_socios
  ADD COLUMN IF NOT EXISTS solicitud_datos_extra_json text;
