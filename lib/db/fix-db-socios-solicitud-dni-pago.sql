-- Documentación DNI, pago, revisión y datos extra en solicitud de alta (Mi perfil → Ser socio).
-- Ejecutar como propietario de la BD o superusuario (el usuario de la app suele no tener ALTER).
-- Opcional: configurar importe y métodos en db_config:
--   membership.solicitud_cuota_importe  → ej. 40.00
--   membership.solicitud_metodos_json   → ej. [{"id":"transferencia","label_es":"Transferencia","label_eu":"Transferentzia"}]
ALTER TABLE db_socios
  ADD COLUMN IF NOT EXISTS dni_doc_anverso_url text,
  ADD COLUMN IF NOT EXISTS dni_doc_reverso_url text,
  ADD COLUMN IF NOT EXISTS solicitud_metodo_pago varchar(50),
  ADD COLUMN IF NOT EXISTS solicitud_cuota_importe numeric(10,2),
  ADD COLUMN IF NOT EXISTS solicitud_revision_campos text,
  ADD COLUMN IF NOT EXISTS solicitud_revision_mensaje text,
  ADD COLUMN IF NOT EXISTS solicitud_datos_extra_json text;
