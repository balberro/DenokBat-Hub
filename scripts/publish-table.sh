#!/usr/bin/env bash
# =============================================================================
# publish-table.sh — Publica una tabla en el entorno de DESTINO (testeo o
# producción) a partir de los .sql exportados con scripts/export-table.sh
# desde la BD local.
#
# Se ejecuta EN EL SERVIDOR DE DESTINO (Dinahosting), donde está la
# credencial DATABASE_URL del destino (testeo/producción).
#
# Uso:
#   ./scripts/publish-table.sh <tabla> [--env test|prod]
#
#   <tabla>   nombre de la tabla a publicar, p. ej.  db_cargos
#   --env     entorno destino: test (por defecto) o prod.
#
# Comportamiento:
#   - Lee scripts/exports/<tabla>.schema.sql y scripts/exports/<tabla>.data.sql
#     (generados por export-table.sh en la BD local y subidos aquí).
#   - Aplica la estructura con CREATE TABLE IF NOT EXISTS (no pisa si existe).
#   - Aplica los datos con INSERT ... ON CONFLICT DO NOTHING (añade SOLO
#     los registros que falten; no toca los existentes en el destino).
#
# Variables de entorno:
#   TEST_ENV_FILE   ruta al .env con DATABASE_URL del destino test
#                   (por defecto scripts/dinahosting-test.env.local).
#   PROD_ENV_FILE   ruta al .env con DATABASE_URL del destino producción
#                   (por defecto scripts/dinahosting-prod.env.local).
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# --- Argumentos ---
if [ $# -lt 1 ]; then
  echo "Uso: ./scripts/publish-table.sh <tabla> [--env test|prod]" >&2
  exit 1
fi
TABLA="$1"
shift
ENV_DEST="test"
while [ $# -gt 0 ]; do
  case "$1" in
    --env) ENV_DEST="${2:?falta entorno (test|prod)}"; shift ;;
    *) echo "Argumento desconocido: $1" >&2; exit 1 ;;
  esac
  shift
done

# Validar nombre de tabla
case "$TABLA" in
  [A-Za-z_][A-Za-z0-9_]*) ;;
  *) echo "Error: nombre de tabla inválido: $TABLA" >&2; exit 1 ;;
esac

# --- Elegir credencial del destino ---
case "$ENV_DEST" in
  test)
    ENV_FILE="${TEST_ENV_FILE:-$ROOT/scripts/dinahosting-test.env.local}" ;;
  prod)
    ENV_FILE="${PROD_ENV_FILE:-$ROOT/scripts/dinahosting-prod.env.local}" ;;
  *) echo "Error: --env debe ser 'test' o 'prod'." >&2; exit 1 ;;
esac

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: no existe el archivo de credencial del destino: $ENV_FILE" >&2
  echo "Para test normalmente está en 'scripts/dinahosting-test.env.local'." >&2
  exit 1
fi

DEST_URI="$(sed -n "s/^[[:space:]]*export[[:space:]]\+DATABASE_URL=\(.\+\)/\1/p; t; s/^[[:space:]]*DATABASE_URL=\(.\+\)/\1/p" "$ENV_FILE" | tail -n1 | tr -d '"' | tr -d "'")"
if [ -z "$DEST_URI" ]; then
  echo "Error: no se encontró DATABASE_URL en $ENV_FILE" >&2
  exit 1
fi

# --- Ficheros de entrada ---
SCHEMA_SQL="$ROOT/scripts/exports/$TABLA.schema.sql"
DATA_SQL="$ROOT/scripts/exports/$TABLA.data.sql"
if [ ! -f "$SCHEMA_SQL" ]; then
  echo "Error: falta $SCHEMA_SQL (genera primero con export-table.sh en tu local)" >&2
  exit 1
fi
if [ ! -f "$DATA_SQL" ]; then
  echo "Error: falta $DATA_SQL (genera primero con export-table.sh en tu local)" >&2
  exit 1
fi

# --- ¿La tabla ya existe en destino? ---
EXISTS="$(psql "$DEST_URI" -At -c "SELECT to_regclass('public.$TABLA')")"
if [ "$EXISTS" = "" ] || [ "$EXISTS" = "NULL" ]; then
  echo "==> La tabla '$TABLA' NO existe en el destino ($ENV_DEST). Se creará con su estructura."
  psql "$DEST_URI" -v ON_ERROR_STOP=1 -f "$SCHEMA_SQL"
else
  echo "==> La tabla '$TABLA' YA existe en el destino ($ENV_DEST). Se conserva su estructura; solo se añadirán datos faltantes."
fi

# --- Aplicar datos (INSERT ... ON CONFLICT DO NOTHING) ---
echo "==> Aplicando datos de '$TABLA' en el destino ($ENV_DEST)... (solo añade los que falten)"
psql "$DEST_URI" -v ON_ERROR_STOP=1 -f "$DATA_SQL"

echo ""
echo "==> Publicación de '$TABLA' → $ENV_DEST completada."
