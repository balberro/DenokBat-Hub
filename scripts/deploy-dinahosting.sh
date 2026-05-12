#!/usr/bin/env bash
# Despliegue en servidor: pull + install + build + toque Passenger.
# Uso (desde la raíz del repo en el hosting):
#   bash ./scripts/deploy-dinahosting.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> git pull"
git pull --ff-only

echo "==> pnpm install"
if [ -f pnpm-lock.yaml ]; then
  pnpm install --frozen-lockfile
else
  pnpm install
fi

echo "==> build (Vite necesita PORT>0; la API se empaqueta aparte)"
export PORT="${DEPLOY_VITE_PORT:-3001}"
export BASE_PATH="${DEPLOY_BASE_PATH:-/}"
export API_PROXY_TARGET="${DEPLOY_API_PROXY_TARGET:-http://127.0.0.1:3001}"
pnpm run build:test

# Asegura rutas de subida necesarias en runtime (avatares, etc.)
echo "==> ensure uploads directories"
mkdir -p "$ROOT/artifacts/api-server/uploads/perfil"
chmod -R 775 "$ROOT/artifacts/api-server/uploads" 2>/dev/null || true

if [ -d "$ROOT/tmp" ]; then
  echo "==> Passenger: touch tmp/restart.txt"
  touch "$ROOT/tmp/restart.txt"
else
  echo "==> Aviso: no existe tmp/; crea la carpeta o reinicia desde el panel de Dinahosting."
fi

echo "==> Listo."
