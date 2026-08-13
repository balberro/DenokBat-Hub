-- ============================================================================
-- Migración de integración Denok Bat ↔ Odoo (facturación account.move)
-- ----------------------------------------------------------------------------
-- Objetivo: separar las identidades de Odoo por modelo y preparar la cola
-- transaccional (outbox) para el disparo asíncrono de facturas y cobros.
--
-- Diseño (no destructivo):
--   * NO se suelta ni se renombra `odoo_id`: la app sigue funcionando durante
--     la transición. Se AÑADEN columnas nuevas por modelo:
--       - db_socios.partner_id          → res.partner.id
--       - db_socios.membership_line_id  → membership.membership_line.id
--       - db_pagos.move_id              → account.move.id
--       - db_pagos.payment_id           → account.payment.id
--       - db_users.partner_id           → caché res.users→res.partner
--   * Se hace backfill desde `odoo_id` (dato existente) a las columnas nuevas.
--   * Se crean db_odoo_outbox + db_odoo_outbox_log (cola de eventos → Odoo).
--
-- Idempotente: se puede ejecutar varias veces sin errores.
-- Ejecutar como propietario de la BD o superusuario.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1) db_socios: identidad de partner y estado de sincronización
-- ============================================================================
ALTER TABLE db_socios
  ADD COLUMN IF NOT EXISTS partner_id          integer,
  ADD COLUMN IF NOT EXISTS membership_line_id  integer,
  ADD COLUMN IF NOT EXISTS odoo_sync_status    varchar(30) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS odoo_sync_error     text,
  ADD COLUMN IF NOT EXISTS odoo_sync_attempts  integer NOT NULL DEFAULT 0;

-- Backfill: si ya existía odoo_id (res.partner), lo copiamos a partner_id.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'db_socios' AND column_name = 'odoo_id'
  ) THEN
    UPDATE db_socios SET partner_id = odoo_id WHERE odoo_id IS NOT NULL AND partner_id IS NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_db_socios_partner_id
  ON db_socios(partner_id) WHERE partner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_db_socios_odoo_sync_status ON db_socios(odoo_sync_status);

-- ============================================================================
-- 2) db_pagos: move_id / payment_id / idempotencia / estado de sincronización
-- ============================================================================
ALTER TABLE db_pagos
  ADD COLUMN IF NOT EXISTS move_id           integer,
  ADD COLUMN IF NOT EXISTS payment_id        integer,
  ADD COLUMN IF NOT EXISTS idempotency_key   varchar(64),
  ADD COLUMN IF NOT EXISTS odoo_sync_status  varchar(30) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS odoo_sync_error   text,
  ADD COLUMN IF NOT EXISTS odoo_sync_attempts integer NOT NULL DEFAULT 0;

-- Backfill: si odoo_id existente procedía de account.move, reubicarlo en move_id.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'db_pagos' AND column_name = 'odoo_id'
  ) THEN
    UPDATE db_pagos SET move_id = odoo_id WHERE odoo_id IS NOT NULL AND move_id IS NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_db_pagos_move_id ON db_pagos(move_id) WHERE move_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_db_pagos_payment_id ON db_pagos(payment_id) WHERE payment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_db_pagos_idem_key ON db_pagos(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_db_pagos_odoo_sync_status ON db_pagos(odoo_sync_status);

-- ============================================================================
-- 3) db_users: caché res.users → res.partner (para resolver socio por JWT uid)
-- ============================================================================
ALTER TABLE db_users
  ADD COLUMN IF NOT EXISTS partner_id integer;

CREATE INDEX IF NOT EXISTS idx_db_users_partner_id ON db_users(partner_id) WHERE partner_id IS NOT NULL;

-- ============================================================================
-- 4) Cola transaccional (outbox) → Odoo
-- ============================================================================
CREATE TABLE IF NOT EXISTS db_odoo_outbox (
  id                bigserial PRIMARY KEY,
  entidad           varchar(30)  NOT NULL,              -- 'socio' | 'pago'
  operacion         varchar(30)  NOT NULL,              -- create_partner | update_partner | create_invoice | register_payment | post_invoice
  entidad_local_id  bigint       NOT NULL,              -- db_socios.id | db_pagos.id
  payload           jsonb        NOT NULL,              -- snapshot de campos a enviar a Odoo
  idempotency_key   varchar(64),
  status            varchar(30)  NOT NULL DEFAULT 'pending',  -- pending|processing|done|failed|dead
  attempts          integer      NOT NULL DEFAULT 0,
  last_error        text,
  available_at      timestamptz  NOT NULL DEFAULT now(),
  created_at        timestamptz  NOT NULL DEFAULT now(),
  updated_at        timestamptz  NOT NULL DEFAULT now()
);

-- Índice de reclamación del worker (SKIP LOCKED sobre pending/failed).
CREATE INDEX IF NOT EXISTS idx_odoo_outbox_claim
  ON db_odoo_outbox (status, available_at, id)
  WHERE status IN ('pending','failed');

-- Índice de idempotencia (evita doble encolado).
CREATE UNIQUE INDEX IF NOT EXISTS ux_odoo_outbox_idem_key
  ON db_odoo_outbox (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Log de intentos (auditoría).
CREATE TABLE IF NOT EXISTS db_odoo_outbox_log (
  id          bigserial PRIMARY KEY,
  outbox_id   bigint NOT NULL REFERENCES db_odoo_outbox(id) ON DELETE CASCADE,
  status      varchar(30) NOT NULL,
  request     jsonb,
  response    jsonb,
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_odoo_outbox_log_outbox ON db_odoo_outbox_log(outbox_id);

COMMIT;

-- ============================================================================
-- Verificación rápida (opcional)
-- ============================================================================
-- SELECT 'socios' AS tabla, count(*) FILTER (WHERE partner_id IS NOT NULL) AS con_odoo,
--        count(*) FILTER (WHERE odoo_sync_status = 'synced') AS sincronizados
--   FROM db_socios;
-- SELECT 'pagos' AS tabla, count(*) FILTER (WHERE move_id IS NOT NULL) AS con_move,
--        count(*) FILTER (WHERE payment_id IS NOT NULL) AS con_payment
--   FROM db_pagos;
-- SELECT status, count(*) FROM db_odoo_outbox GROUP BY status;
