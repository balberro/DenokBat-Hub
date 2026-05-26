-- Acta firmada en PDF: ruta y metadatos del archivo guardado al firmar.
-- Convivencia con db_actas: solo se persisten datos del PDF cuando el acta
-- pasa a estado 'firmada' (o cuando un contable/directivo lo adjunta a un
-- acta ya firmada). Idempotente; ejecutar como owner o superuser.

ALTER TABLE db_actas
  ADD COLUMN IF NOT EXISTS pdf_url        TEXT,
  ADD COLUMN IF NOT EXISTS pdf_filename   TEXT,
  ADD COLUMN IF NOT EXISTS pdf_anyo_mes   VARCHAR(7),
  ADD COLUMN IF NOT EXISTS pdf_size       INTEGER,
  ADD COLUMN IF NOT EXISTS pdf_subido_en  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pdf_subido_por INTEGER;

-- Índice para listar/buscar por año-mes (carpeta del archivo).
CREATE INDEX IF NOT EXISTS db_actas_pdf_anyo_mes_idx
  ON db_actas (pdf_anyo_mes)
  WHERE pdf_anyo_mes IS NOT NULL;
