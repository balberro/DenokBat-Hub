#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_ENV_FILE="${TEST_ENV_FILE:-$ROOT_DIR/scripts/dinahosting-test.env.local}"

if [ -f "$TEST_ENV_FILE" ]; then
  echo "==> Cargando variables de test: $TEST_ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  . "$TEST_ENV_FILE"
  set +a
else
  echo "==> No existe $TEST_ENV_FILE (usando variables del entorno actual)"
fi

cd "$ROOT_DIR"
pnpm run start:test
