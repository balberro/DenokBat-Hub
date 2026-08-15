#!/usr/bin/env bash
# =============================================================================
# export-many.sh — Exporta VARIAS tablas de la BD local en un solo comando,
# pero CADA tabla se exporta POR SEPARADO (se llama a export-table.sh una vez
# por tabla). Nunca se mezclan tablas en el mismo fichero.
#
# Uso:
#   ./scripts/export-many.sh <tabla1> <tabla2> ... [--dir carpeta]
#
#   p. ej.:
#     ./scripts/export-many.sh db_cargos db_historico_cargos db_socios
#     ./scripts/export-many.sh db_cargos db_historico_cargos --dir organigrama
#
# Para CADA tabla genera:
#   exports/<tabla>.schema.sql   (estructura — crea si no existe)
#   exports/<tabla>.data.sql     (datos — añade solo faltantes)
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# --- Argumentos ---
if [ $# -lt 1 ]; then
  echo "Uso: ./scripts/export-many.sh <tabla1> <tabla2> ... [--dir carpeta]" >&2
  exit 1
fi
TABLAS=()
OUT_DIR_ARG=()
while [ $# -gt 0 ]; do
  case "$1" in
    --dir) OUT_DIR_ARG=(--dir "$2"); shift ;;
    -*) echo "Argumento desconocido: $1" >&2; exit 1 ;;
    *) TABLAS+=("$1") ;;
  esac
  shift
done

if [ "${#TABLAS[@]}" -eq 0 ]; then
  echo "Error: indica al menos una tabla." >&2
  exit 1
fi

echo "==> Exportando ${#TABLAS[@]} tabla(s) (una a una, por separado)..."
FAILED=0
for t in "${TABLAS[@]}"; do
  echo ""
  echo "────────────────────────────────────────"
  echo ">>> Tabla: $t"
  if ! bash "$ROOT/scripts/export-table.sh" "$t" "${OUT_DIR_ARG[@]:-}" 2>&1; then
    echo "    [ERROR] falló la exportación de '$t'" >&2
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "════════════════════════════════════════"
if [ "$FAILED" -eq 0 ]; then
  echo "==> Exportadas las ${#TABLAS[@]} tabla(s) correctamente."
else
  echo "==> $FAILED de ${#TABLAS[@]} tabla(s) fallaron. Revisa los errores anteriores."
  exit 1
fi
echo ""
echo "    Súbete los ficheros exports/<tabla>.{schema,data}.sql al servidor"
echo "    (scp/FTP/git) a scripts/exports/ y allí publica de una en una:"
echo "      bash ./scripts/publish-table.sh <tabla>"
for t in "${TABLAS[@]}"; do
  echo "      bash ./scripts/publish-table.sh $t"
done
