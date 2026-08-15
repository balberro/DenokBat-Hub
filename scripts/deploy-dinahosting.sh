#!/usr/bin/env bash
# Despliegue en servidor: pull + install + build + toque Passenger.
# Uso (desde la raíz del repo en el hosting):
#   bash ./scripts/deploy-dinahosting.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if command -v pnpm >/dev/null 2>&1; then
  PNPM=(pnpm)
elif command -v corepack >/dev/null 2>&1; then
  PNPM=(corepack pnpm)
else
  echo "Error: no se encuentra pnpm ni corepack en PATH." >&2
  exit 1
fi

echo "==> git pull"
git pull --ff-only

echo "==> pnpm install"
if [ -f pnpm-lock.yaml ]; then
  "${PNPM[@]}" install --frozen-lockfile
else
  "${PNPM[@]}" install
fi

echo "==> build (Vite necesita PORT>0; la API se empaqueta aparte)"
export PORT="${DEPLOY_VITE_PORT:-3001}"
export BASE_PATH="${DEPLOY_BASE_PATH:-/}"
export API_PROXY_TARGET="${DEPLOY_API_PROXY_TARGET:-http://127.0.0.1:3001}"
"${PNPM[@]}" run build:test

# Asegura rutas de subida necesarias en runtime (avatares, PDFs, imágenes, etc.).
# El código servidor resuelve la raíz de uploads de forma centralizada en
# artifacts/api-server/src/lib/storage.ts (UPLOADS_ROOT, sobreescribible con
# la variable UPLOADS_DIR); aquí creamos la estructura base para que los
# permisos de escritura (grupo de la app) queden aplicados de forma consistente.
# Cualquier script que sincronice con Odoo (socios/actividades/pagos) debe
# escribir dentro de esta misma raíz, nunca en rutas hardcodeadas.
UPLOADS_BASE="${UPLOADS_DIR:-$ROOT/artifacts/api-server/uploads}"
echo "==> ensure uploads directories ($UPLOADS_BASE)"
mkdir -p \
  "$UPLOADS_BASE/perfil" \
  "$UPLOADS_BASE/socios/dni" \
  "$UPLOADS_BASE/actividades" \
  "$UPLOADS_BASE/pagos" \
  "$UPLOADS_BASE/actas" \
  "$UPLOADS_BASE/expedientes" \
  "$UPLOADS_BASE/propuestas" \
  "$UPLOADS_BASE/sugerencias" \
  "$UPLOADS_BASE/estatutos" \
  "$UPLOADS_BASE/articulos" \
  "$UPLOADS_BASE/galeria" \
  "$UPLOADS_BASE/hojas" \
  "$UPLOADS_BASE/pulunpes"
chmod -R 775 "$UPLOADS_BASE" 2>/dev/null || true

# Carpeta de recepción de dumps para publicar tablas entre entornos
# (export-table.sh / export-many.sh en local → publish-table.sh aquí).
EXPORTS_DIR="${EXPORTS_DIR:-$ROOT/scripts/exports}"
echo "==> ensure exports directory ($EXPORTS_DIR)"
mkdir -p "$EXPORTS_DIR"
chmod -R 775 "$EXPORTS_DIR" 2>/dev/null || true

if [ -d "$ROOT/tmp" ]; then
  echo "==> Passenger: touch tmp/restart.txt"
  touch "$ROOT/tmp/restart.txt"
else
  echo "==> Aviso: no existe tmp/; crea la carpeta o reinicia desde el panel de Dinahosting."
fi

echo "==> Listo."
