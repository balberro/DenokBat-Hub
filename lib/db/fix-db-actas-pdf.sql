-- [DEPRECADO] El PDF firmado ya no vive en columnas de db_actas.
--
-- El PDF firmado (documento externo) se guarda ahora en la tabla `db_actas_pdf`
-- (relación 1:1 con el acta). Ver `fix-db-actas-aceptada.sql`, que crea la tabla
-- y migra los datos desde las antiguas columnas `db_actas.pdf_*`.
--
-- Este fichero se conserva por compatibilidad: si alguna base de datos antigua
-- llegó a ejecutarlo, ya tendrá las columnas `pdf_*` en db_actas. La migración
-- `fix-db-actas-aceptada.sql` copia esos valores a `db_actas_pdf`.
--
-- Idempotente; ejecutar como owner / superusuario.

COMMENT ON TABLE db_actas IS 'Actas de la app. Estados: borrador | completa | aceptada.';

