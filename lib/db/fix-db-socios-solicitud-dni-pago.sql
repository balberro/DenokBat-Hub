-- Documentación DNI y datos de pago en solicitud de alta (Mi perfil → Ser socio).
-- Opcional: configurar importe y métodos en db_config:
--   membership.solicitud_cuota_importe  → ej. 40.00
--   membership.solicitud_metodos_json   → ej. [{"id":"transferencia","label_es":"Transferencia","label_eu":"Transferentzia"}]
ALTER TABLE db_socios
  ADD COLUMN IF NOT EXISTS dni_doc_anverso_url text,
  ADD COLUMN IF NOT EXISTS dni_doc_reverso_url text,
  ADD COLUMN IF NOT EXISTS solicitud_metodo_pago varchar(50),
  ADD COLUMN IF NOT EXISTS solicitud_cuota_importe numeric(10,2);
