-- Crea tablas de cargos y su historico (idempotente).
-- Ejecutar en cada entorno:
--   psql "$DATABASE_URL" -f lib/db/create-db-cargos.sql

BEGIN;

CREATE TABLE IF NOT EXISTS db_cargos (
  id serial PRIMARY KEY,
  codigo varchar(100) NOT NULL UNIQUE,
  nombre varchar(255) NOT NULL,
  nombre_eu varchar(255),
  ambito varchar(30) NOT NULL DEFAULT 'directivo',
  activo integer NOT NULL DEFAULT 1,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS db_historico_cargos (
  id serial PRIMARY KEY,
  socio_id integer NOT NULL,
  cargo_id integer NOT NULL,
  fecha_inicio date NOT NULL,
  fecha_fin date,
  descripcion text,
  descripcion_eu text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS db_estatutos (
  id serial PRIMARY KEY,
  titulo varchar(255) NOT NULL,
  titulo_eu varchar(255),
  pdf_url text NOT NULL,
  vigencia_desde date NOT NULL,
  vigencia_hasta date,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS db_actas_asamblea (
  id serial PRIMARY KEY,
  titulo varchar(255) NOT NULL,
  titulo_eu varchar(255),
  pdf_url text NOT NULL,
  fecha_acta date NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Si la tabla ya existia sin constraints, las añade de forma segura.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'db_historico_cargos_socio_fk') THEN
    BEGIN
      ALTER TABLE db_historico_cargos
        ADD CONSTRAINT db_historico_cargos_socio_fk
        FOREIGN KEY (socio_id)
        REFERENCES db_socios(id)
        ON DELETE CASCADE;
    EXCEPTION
      WHEN insufficient_privilege THEN
        -- El usuario no tiene REFERENCES sobre db_socios.
        NULL;
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'db_historico_cargos_cargo_fk') THEN
    BEGIN
      ALTER TABLE db_historico_cargos
        ADD CONSTRAINT db_historico_cargos_cargo_fk
        FOREIGN KEY (cargo_id)
        REFERENCES db_cargos(id)
        ON DELETE CASCADE;
    EXCEPTION
      WHEN insufficient_privilege THEN
        -- El usuario no tiene REFERENCES.
        NULL;
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_db_cargos_ambito ON db_cargos(ambito);
CREATE INDEX IF NOT EXISTS idx_db_cargos_activo ON db_cargos(activo);
CREATE INDEX IF NOT EXISTS idx_db_historico_cargos_socio_id ON db_historico_cargos(socio_id);
CREATE INDEX IF NOT EXISTS idx_db_historico_cargos_cargo_id ON db_historico_cargos(cargo_id);
CREATE INDEX IF NOT EXISTS idx_db_historico_cargos_fecha_inicio ON db_historico_cargos(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_db_historico_cargos_fecha_fin ON db_historico_cargos(fecha_fin);
CREATE INDEX IF NOT EXISTS idx_db_estatutos_vigencia_desde ON db_estatutos(vigencia_desde);
CREATE INDEX IF NOT EXISTS idx_db_estatutos_vigencia_hasta ON db_estatutos(vigencia_hasta);
CREATE INDEX IF NOT EXISTS idx_db_actas_asamblea_fecha_acta ON db_actas_asamblea(fecha_acta);

-- Cargos base para Fundadores, Direccion y Delegados.
INSERT INTO db_cargos (codigo, nombre, nombre_eu, ambito, activo)
VALUES
  ('fundador', 'Fundador/a', 'Sortzailea', 'fundador', 1),
  ('presidencia', 'Presidencia', 'Presidentzia', 'directivo', 1),
  ('vicepresidencia', 'Vicepresidencia', 'Presidenteordetza', 'directivo', 1),
  ('secretaria', 'Secretaria', 'Idazkaria', 'directivo', 1),
  ('tesoreria', 'Tesoreria', 'Diruzaintza', 'directivo', 1),
  ('vocal', 'Vocal', 'Bozeramailea', 'directivo', 1),
  ('delegado_zona', 'Delegado/a de zona', 'Zona ordezkaria', 'delegado', 1)
ON CONFLICT (codigo) DO UPDATE
SET
  nombre = EXCLUDED.nombre,
  nombre_eu = EXCLUDED.nombre_eu,
  ambito = EXCLUDED.ambito,
  activo = EXCLUDED.activo,
  updated_at = now();

COMMIT;
