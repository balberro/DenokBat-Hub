-- Valores por defecto opcionales para datos de la asociación (db_config).
-- Ejecutar una sola vez si quieres semilla inicial; ON CONFLICT no sobrescribe valores ya guardados.

INSERT INTO db_config (clave, valor, descripcion, updated_at)
VALUES
  ('asociacion.cuota_ingreso_socio', '40.00', 'Cuota de alta / solicitud de socio (EUR)', NOW()),
  ('asociacion.cuota_anual_socio', '', 'Cuota anual ordinaria (EUR); rellenar desde contabilidad', NOW())
ON CONFLICT (clave) DO NOTHING;
