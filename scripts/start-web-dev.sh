#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$ROOT_DIR/artifacts/api-server"
WEB_DIR="$ROOT_DIR/artifacts/denok-bat"
DEV_CONFIG_FILE="${DEV_CONFIG_FILE:-$ROOT_DIR/scripts/dev-web.env.local}"

# Carga variables opcionales desde archivo de configuración local.
# Formato: KEY=VALUE (sin "export"), una por línea.
if [ -f "$DEV_CONFIG_FILE" ]; then
  echo "==> Cargando configuración local: $DEV_CONFIG_FILE"
  # shellcheck disable=SC1090
  set -a
  . "$DEV_CONFIG_FILE"
  set +a
fi

# Valores por defecto (puedes sobrescribirlos al ejecutar el comando).
DATABASE_URL="${DATABASE_URL:-postgres://denokbat:denokbat@127.0.0.1:5432/denokbat}"
JWT_SECRET="${JWT_SECRET:-denokbat-dev-secret}"
API_PORT="${API_PORT:-8080}"
WEB_PORT="${WEB_PORT:-8081}"
BASE_PATH="${BASE_PATH:-/}"
API_PROXY_TARGET="${API_PROXY_TARGET:-http://127.0.0.1:${API_PORT}}"
FORCE_RESTART="${FORCE_RESTART:-0}"
ODOO_URL="${ODOO_URL:-http://127.0.0.1:8069}"
ODOO_DB="${ODOO_DB:-dinaserver}"
ODOO_USERNAME="${ODOO_USERNAME:-dinaodooapi}"
ODOO_PASSWORD="${ODOO_PASSWORD:-}"
ODOO_API_KEY="${ODOO_API_KEY:-}"

run_dev() {
  if command -v pnpm >/dev/null 2>&1; then
    pnpm dev
    return
  fi
  if command -v corepack >/dev/null 2>&1; then
    corepack pnpm dev
    return
  fi
  npm run dev
}

is_port_in_use() {
  local port="$1"
  # -H evita cabecera; si hay salida, el puerto está ocupado.
  ss -H -ltn "( sport = :${port} )" | awk 'NR > 0 { found = 1 } END { exit !found }'
}

port_process_info() {
  local port="$1"
  ss -ltnp "( sport = :${port} )" | awk 'NR > 1 { print $0 }'
}

kill_port_processes() {
  local port="$1"
  local pids
  pids="$(ss -ltnp "( sport = :${port} )" | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | sort -u)"
  if [ -z "$pids" ]; then
    return
  fi
  echo "==> FORCE_RESTART=1: cerrando procesos en puerto ${port}: ${pids}"
  # shellcheck disable=SC2086
  kill $pids >/dev/null 2>&1 || true
}

API_PID=""
if is_port_in_use "$API_PORT"; then
  if [ "$FORCE_RESTART" = "1" ]; then
    kill_port_processes "$API_PORT"
    sleep 1
  fi
fi
if is_port_in_use "$API_PORT"; then
  echo "==> Puerto ${API_PORT} ocupado: no se inicia una nueva API."
  port_process_info "$API_PORT" | sed 's/^/    /'
else
  echo "==> Iniciando API en :${API_PORT}"
  (
    cd "$API_DIR"
    DATABASE_URL="$DATABASE_URL" \
    JWT_SECRET="$JWT_SECRET" \
    ODOO_URL="$ODOO_URL" \
    ODOO_DB="$ODOO_DB" \
    ODOO_USERNAME="$ODOO_USERNAME" \
    ODOO_PASSWORD="$ODOO_PASSWORD" \
    ODOO_API_KEY="$ODOO_API_KEY" \
    PORT="$API_PORT" \
    NODE_ENV=development \
    run_dev
  ) &
  API_PID=$!
fi

cleanup() {
  if [ -n "$API_PID" ] && kill -0 "$API_PID" >/dev/null 2>&1; then
    kill "$API_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

if is_port_in_use "$WEB_PORT"; then
  if [ "$FORCE_RESTART" = "1" ]; then
    kill_port_processes "$WEB_PORT"
    sleep 1
  fi
fi
if is_port_in_use "$WEB_PORT"; then
  echo "==> Puerto ${WEB_PORT} ocupado: no se inicia una nueva web."
  port_process_info "$WEB_PORT" | sed 's/^/    /'
  if [ -n "$API_PID" ]; then
    wait "$API_PID"
  fi
  exit 0
fi

echo "==> Iniciando web en :${WEB_PORT}"
echo "    URL: http://localhost:${WEB_PORT}"
cd "$WEB_DIR"
PORT="$WEB_PORT" \
BASE_PATH="$BASE_PATH" \
API_PROXY_TARGET="$API_PROXY_TARGET" \
run_dev
