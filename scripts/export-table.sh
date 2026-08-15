#!/usr/bin/env bash
# =============================================================================
# export-table.sh — Exporta una tabla de la BD LOCAL para publicarla en otro
# entorno (testeo / producción).
#
# Se ejecuta EN TU MÁQUINA LOCAL (donde está tu BD de desarrollo).
# Genera DOS ficheros por tabla, listos para publish-table.sh del destino:
#
#   <tabla>.schema.sql   Estructura (CREATE TABLE IF NOT EXISTS ...) → crea si no existe.
#   <tabla>.data.sql     Datos (INSERT ... ON CONFLICT DO NOTHING)   → añade solo faltantes.
#
# Uso:
#   ./scripts/export-table.sh <tabla> [--dir carpeta]
#
#   <tabla>   nombre de la tabla, p. ej.  db_cargos  o  db_historico_cargos
#   --dir     carpeta de salida (por defecto: ./exports)
#
# Variables de entorno:
#   DATABASE_URL   URL de tu BD local; si no se indica, se lee de
#                  scripts/dev-web.env.local (o $DEV_CONFIG_FILE).
#
# Los .sql generados se suben al servidor de destino (scp/FTP/git) a
# scripts/exports/ y allí se ejecuta:
#      bash ./scripts/publish-table.sh <tabla>
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEV_ENV="${DEV_CONFIG_FILE:-$ROOT/scripts/dev-web.env.local}"

# --- Argumentos ---
if [ $# -lt 1 ]; then
  echo "Uso: ./scripts/export-table.sh <tabla> [--dir carpeta]" >&2
  exit 1
fi
TABLA="$1"
shift
OUT_DIR="exports"
while [ $# -gt 0 ]; do
  case "$1" in
    --dir) OUT_DIR="${2:?falta carpeta para --dir}"; shift ;;
    *) echo "Argumento desconocido: $1" >&2; exit 1 ;;
  esac
  shift
done

# Validar nombre de tabla (solo alfanum + guion bajo, prefijo típico db_)
case "$TABLA" in
  [A-Za-z_][A-Za-z0-9_]*) ;;
  *) echo "Error: nombre de tabla inválido: $TABLA" >&2; exit 1 ;;
esac

# --- Resolver DATABASE_URL de la BD local ---
DATABASE_URL="${DATABASE_URL:-}"
if [ -z "$DATABASE_URL" ] && [ -f "$DEV_ENV" ]; then
  export LOCAL_URI
  LOCAL_URI="$(sed -n "s/^[[:space:]]*export[[:space:]]\+DATABASE_URL=\(.\+\)/\1/p; t; s/^[[:space:]]*DATABASE_URL=\(.\+\)/\1/p" "$DEV_ENV" | tail -n1 | tr -d '"' | tr -d "'")"
  if [ -z "$LOCAL_URI" ]; then
    echo "Error: no se encontró DATABASE_URL en $DEV_ENV" >&2
    exit 1
  fi
  DATABASE_URL="$LOCAL_URI"
fi
if [ -z "$DATABASE_URL" ]; then
  echo "Error: no se encontró la BD local. Define DATABASE_URL o revisa $DEV_ENV" >&2
  exit 1
fi

# --- Comprobar que la tabla existe en la BD local ---
EXISTS="$(psql "$DATABASE_URL" -At -c "SELECT to_regclass('public.$TABLA')")"
if [ "$EXISTS" = "" ] || [ "$EXISTS" = "NULL" ]; then
  echo "Error: la tabla '$TABLA' no existe en la BD local." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
SCHEMA_SQL="$OUT_DIR/$TABLA.schema.sql"
DATA_SQL="$OUT_DIR/$TABLA.data.sql"

# --- Estructura: CREATE TABLE IF NOT EXISTS (crea si no existe) ---
{
  echo "-- Estructura de public.$TABLA"
  pg_dump --table="$TABLA" --schema-only --no-owner --no-privileges \
    --no-comments "$DATABASE_URL" 2>/dev/null \
    | sed "s/^CREATE TABLE public\.$TABLA /CREATE TABLE IF NOT EXISTS public.$TABLA /"
} > "$SCHEMA_SQL"

# --- Datos: INSERT ... ON CONFLICT DO NOTHING (añade solo faltantes) ---
{
  echo "-- Datos de public.$TABLA (INSERT ... ON CONFLICT DO NOTHING)"
  pg_dump --table="$TABLA" --data-only --inserts --on-conflict-do-nothing \
    --no-owner --no-privileges --no-comments "$DATABASE_URL" 2>/dev/null
} > "$DATA_SQL"

echo "==> Exportada '$TABLA' desde la BD local:"
echo "      $SCHEMA_SQL   (estructura — crea si no existe)"
echo "      $DATA_SQL     (datos — añade solo faltantes)"
echo ""
echo "    Súbelos al servidor de destino (scp/FTP/git) a:  $ROOT/scripts/exports/"
echo "    y ejecuta allí:"
echo "      cd <raíz del proyecto> && bash ./scripts/publish-table.sh $TABLA"
