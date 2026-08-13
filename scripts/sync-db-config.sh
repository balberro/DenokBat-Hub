#!/usr/bin/env bash
# Sincroniza la tabla `db_config` entre la BD local (origen) y test/prod (destino).
#
# IMPORTANTE: solo AÑADE filas que falten en el destino. NO sobrescribe las que ya
# existen, porque en test/producción esas claves pueden haber sido editadas a mano.
# Usa por tanto: INSERT ... ON CONFLICT (clave) DO NOTHING
#
# Credenciales (se toman automáticamente de estos .env.local si existen, o se pasan a mano):
#   - Locales : scripts/dev-web.env.local   (o variable DATABASE_URL)
#   - Destino : scripts/dinahosting-test.env.local (o variable TEST_DATABASE_URL)
#
# Modos:
#   ./scripts/sync-db-config.sh diff        # solo lectura: qué falta en destino
#   ./scripts/sync-db-config.sh export      # genera .sql portátil (INSERT ... DO NOTHING)
#   ./scripts/sync-db-config.sh apply       # inserta en destino solo las claves que faltan
#
# Filtro de claves (variable SCOPE):
#   SCOPE=asociacion   (por defecto) solo claves `asociacion.*`
#   SCOPE=formularios  asocia + membership.solicitud.* (lo que alimenta el formulario de alta de socio)
#   SCOPE=todo         todas las claves de db_config
#
# Ejemplos:
#   SCOPE=formularios ./scripts/sync-db-config.sh diff
#   TEST_DATABASE_URL="postgres://..." ./scripts/sync-db-config.sh apply
#   SCOPE=todo OUT_FILE=./db-config-sync.sql ./scripts/sync-db-config.sh export
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-diff}"
SCOPE="${SCOPE:-asociacion}"
OUT_FILE="${OUT_FILE:-$ROOT/db-config-sync.sql}"
LOCAL_ENV="${DEV_CONFIG_FILE:-$ROOT/scripts/dev-web.env.local}"
TEST_ENV="${TEST_ENV_FILE:-$ROOT/scripts/dinahosting-test.env.local}"

# --- Extrae el valor de una KEY de un archivo .env (formato KEY=VALUE, sin "export") ---
env_uri() { # $1 archivo, $2 KEY
  sed -n "s/^[[:space:]]*export[[:space:]]\+${2}=\(.\+\)/\1/p; t; s/^[[:space:]]*${2}=\(.\+\)/\1/p" "$1" \
    | tail -n1 | tr -d '"' | tr -d "'"
}

# --- BD local ---
LOCAL_DATABASE_URL="${LOCAL_DATABASE_URL:-}"
if [ -z "${LOCAL_DATABASE_URL:-}" ] && [ -n "${DATABASE_URL:-}" ]; then
  LOCAL_DATABASE_URL="$DATABASE_URL"
fi
if [ -z "${LOCAL_DATABASE_URL:-}" ] && [ -f "$LOCAL_ENV" ]; then
  echo "==> BD local desde $LOCAL_ENV"
  LOCAL_DATABASE_URL="$(env_uri "$LOCAL_ENV" DATABASE_URL)"
fi

# --- BD destino ---
TEST_DATABASE_URL="${TEST_DATABASE_URL:-}"
if [ -z "${TEST_DATABASE_URL:-}" ] && [ -f "$TEST_ENV" ]; then
  echo "==> BD destino desde $TEST_ENV"
  TEST_DATABASE_URL="$(env_uri "$TEST_ENV" DATABASE_URL)"
fi

case "$SCOPE" in
  asociacion)  WHERE="clave LIKE 'asociacion.%'" ;;
  formularios) WHERE="(clave LIKE 'asociacion.%' OR clave LIKE 'membership.solicitud.%')" ;;
  todo)        WHERE="TRUE" ;;
  *) echo "Error: SCOPE no válido: $SCOPE (asociacion | formularios | todo)" >&2; exit 1 ;;
esac

# --- diff: solo lectura, compara claves entre local y destino ---
if [ "$MODE" = "diff" ]; then
  if [ -z "${LOCAL_DATABASE_URL:-}" ] || [ -z "${TEST_DATABASE_URL:-}" ]; then
    echo "Error: modo diff necesita BD local y BD destino." >&2
    exit 1
  fi
  echo "==> Comparando ($SCOPE) local vs destino..."
  psql "$LOCAL_DATABASE_URL" -At -c "SELECT clave FROM db_config WHERE $WHERE" | sort > /tmp/_local_keys.txt
  psql "$TEST_DATABASE_URL" -At -c "SELECT clave FROM db_config WHERE $WHERE" | sort > /tmp/_test_keys.txt
  echo
  echo "--- SOLO en local (faltan en destino → se añadirían) ---"
  comm -23 /tmp/_local_keys.txt /tmp/_test_keys.txt || true
  echo
  echo "--- SOLO en destino (local no las tiene → NO se tocan) ---"
  comm -13 /tmp/_local_keys.txt /tmp/_test_keys.txt || true
  echo
  echo "--- Totales ---"
  echo "   local   : $(wc -l < /tmp/_local_keys.txt)"
  echo "   destino : $(wc -l < /tmp/_test_keys.txt)"
  exit 0
fi

# --- export / apply necesitan la BD local ---
if [ -z "${LOCAL_DATABASE_URL:-}" ]; then
  echo "Error: no se encontró la BD local (o $LOCAL_ENV)." >&2
  exit 1
fi

# Crea una tabla auxiliar con las filas del SCOPE y la vuelca con pg_dump.
# Se usa ON CONFLICT DO NOTHING para no tocar claves ya existentes en destino.
TMP_TABLE="_db_config_sync_export_$$"
CLEANUP() { psql "$LOCAL_DATABASE_URL" -q -c "DROP TABLE IF EXISTS $TMP_TABLE;" >/dev/null 2>&1 || true; }
trap CLEANUP EXIT

GENERATE() {
  psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 -q -c "
    DROP TABLE IF EXISTS $TMP_TABLE;
    CREATE TABLE $TMP_TABLE (LIKE db_config INCLUDING ALL);
    INSERT INTO $TMP_TABLE SELECT * FROM db_config WHERE $WHERE;
  " >/dev/null
  pg_dump --table="$TMP_TABLE" --data-only --inserts --on-conflict-do-nothing "$LOCAL_DATABASE_URL" \
    | sed "s/INSERT INTO public\.$TMP_TABLE VALUES/INSERT INTO db_config VALUES/" \
    | grep "^INSERT INTO"
  psql "$LOCAL_DATABASE_URL" -q -c "DROP TABLE IF EXISTS $TMP_TABLE;" >/dev/null 2>&1 || true
}

if [ "$MODE" = "export" ]; then
  GENERATE > "$OUT_FILE"
  echo "==> Exportadas $(grep -c '^INSERT INTO' "$OUT_FILE" | tr -d ' ') sentencias (solo AÑADE faltantes) a: $OUT_FILE"
  echo "    Aplica en el destino con:"
  echo "      $0 apply    (si TEST_DATABASE_URL accesible desde aquí)"
  echo "      psql \"\$TEST_DATABASE_URL\" -f $OUT_FILE   (manualmente / en el server)"
  exit 0
fi

if [ "$MODE" = "apply" ]; then
  if [ -z "${TEST_DATABASE_URL:-}" ]; then
    echo "Error: modo apply necesita TEST_DATABASE_URL (o $TEST_ENV)." >&2
    exit 1
  fi
  echo "==> Aplicando ($SCOPE) desde local hacia destino (solo añade faltantes)..."
  psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 <<SQL
BEGIN;
$(GENERATE)
COMMIT;
SQL
  echo "==> Aplicado en destino. No se tocaron las claves existentes."
  exit 0
fi

echo "Error: modo no válido: $MODE (diff | export | apply)" >&2
exit 1
