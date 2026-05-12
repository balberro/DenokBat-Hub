#!/usr/bin/env bash
# Actualiza el código de test en el servidor Dinahosting: pull, dependencias, build y reinicio.
# Ejecutar por SSH en la raíz del repositorio del hosting, por ejemplo:
#   cd /home/denokbat0/www/azkendantza && bash ./scripts/update-dinahosting-test.sh
#
# Variables opcionales:
#   SKIP_PM2_RELOAD=1   no intenta pm2 reload (solo build + Passenger touch)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

bash "$ROOT/scripts/deploy-dinahosting.sh"

if [ "${SKIP_PM2_RELOAD:-}" = "1" ]; then
  echo "==> SKIP_PM2_RELOAD=1: no se recarga PM2."
  exit 0
fi

if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe denokbat-test >/dev/null 2>&1; then
    echo "==> pm2 reload denokbat-test"
    pm2 reload denokbat-test --update-env
  else
    echo "==> PM2 instalado pero no hay app 'denokbat-test'. Arráncala con: pm2 start ecosystem.config.cjs --env production"
  fi
else
  echo "==> PM2 no está en PATH; si usas solo Passenger, basta con tmp/restart.txt (ya tocado por deploy-dinahosting.sh)."
fi

echo "==> Actualización de test completada."
