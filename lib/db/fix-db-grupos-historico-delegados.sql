-- Back-fill: registra en db_historico_cargos las líneas de "delegado_zona" para
-- los delegados ya asignados en db_grupos. Idempotente: no duplica líneas
-- que ya estén abiertas (fecha_fin IS NULL) para el mismo socio+cargo+grupo.

DO $$
DECLARE
  v_cargo_id integer;
BEGIN
  -- Asegura que existe el cargo "delegado_zona".
  SELECT id INTO v_cargo_id FROM db_cargos WHERE codigo = 'delegado_zona' LIMIT 1;
  IF v_cargo_id IS NULL THEN
    INSERT INTO db_cargos (codigo, nombre, nombre_eu, ambito, activo)
    VALUES ('delegado_zona', 'Delegado/a de zona', 'Zona ordezkaria', 'delegado', 1)
    RETURNING id INTO v_cargo_id;
  END IF;

  -- Inserta una línea abierta por cada grupo con delegado, salvo que ya exista
  -- una línea abierta para ese socio + cargo + grupo (marcador "[grupo:<id>]"
  -- en descripcion).
  INSERT INTO db_historico_cargos (socio_id, cargo_id, fecha_inicio, descripcion, descripcion_eu)
  SELECT g.delegado_id,
        v_cargo_id,
        CURRENT_DATE,
        'Delegado/a del grupo "' || g.nombre || '" [grupo:' || g.id || ']',
        '"' || g.nombre || '" taldeko ordezkaria [grupo:' || g.id || ']'
    FROM db_grupos g
  WHERE g.delegado_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
        FROM db_historico_cargos h
        WHERE h.socio_id = g.delegado_id
          AND h.cargo_id = v_cargo_id
          AND h.fecha_fin IS NULL
          AND COALESCE(h.descripcion, '') LIKE '%[grupo:' || g.id || ']%'
    );
END $$;
