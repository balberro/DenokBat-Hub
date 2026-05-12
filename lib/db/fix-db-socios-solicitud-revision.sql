-- Resolución de solicitudes de socio (gestión): campos marcados para corrección por el usuario.
ALTER TABLE db_socios
  ADD COLUMN IF NOT EXISTS solicitud_revision_campos text,
  ADD COLUMN IF NOT EXISTS solicitud_revision_mensaje text;

-- Estados adicionales en estado: pendiente_datos, rechazado (varchar ya suficiente en instalaciones típicas).
