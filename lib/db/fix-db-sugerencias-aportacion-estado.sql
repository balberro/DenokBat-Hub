-- Sincronización del estado entre sugerencia raíz y sus aportaciones.
-- Las aportaciones (parent_id IS NOT NULL) heredan el estado de la sugerencia raíz.
-- La lógica vive en el código (POST aportación + PUT raíz propaga a hijas);
-- este script hace el back-fill para filas ya existentes en la base de datos.

UPDATE db_sugerencias h
  SET estado = r.estado,
      updated_at = now()
  FROM db_sugerencias r
WHERE h.parent_id = r.id
  AND h.estado IS DISTINCT FROM r.estado;
