# Informe Técnico de Integración — Denok Bat ↔ Odoo ERP (XML-RPC)

> **Alcance:** Socios (`res.partner`) y Cobros/Facturación (`account.move`, `account.payment`).
> **Sistema actual:** API Express (`artifacts/api-server`) + PostgreSQL/Drizzle (`lib/db`) + cliente XML-RPC (`lib/odoo.ts`).
> **Sincronización actual:** unidireccional Odoo → Local (`lib/sync.ts`, disparada por `/api/sync`). Escrituras puntuales Local → Odoo en `socios.ts`.

---

## 1. Diagnóstico de Impacto

### 1.1 Inventario de puntos de contacto con Odoo (estado actual)

| # | Archivo / Función | Modelo Odoo usado | Comportamiento actual | Impacto para la integración |
|---|---|---|---|---|
| 1 | `src/lib/odoo.ts` — `odooCall` / `odooAuthenticate` / `odooCallAsUser` | XML-RPC `execute_kw` | Cliente genérico con caché de sesión (TTL 5 min) y deduplicación de auth | ✅ Reutilizable. Añadir soporte JSON-RPC como capa opcional, sin romper XML-RPC |
| 2 | `src/routes/auth.ts` — `POST /auth/login` | `res.users`, `res.groups` | `uid = res.users.id` se guarda en `db_users.odoo_uid` y se firma en JWT | ⚠️ Crítico: `uid` es **res.users**, NO `res.partner`. Hay que resolver `partner_id` |
| 3 | `src/routes/socios.ts` — `POST /socios` | `res.partner` (create), `res.partner.category` | Crea partner en Odoo de forma **síncrona** y guarda `odoo_id = partner_id` | ⚠️ Debe pasar a cola asíncrona (outbox) para no bloquear el alta |
| 4 | `src/routes/socios.ts` — `PUT /socios/:id` | `res.partner` (write) | Update síncrono de partner si `current.odooId` existe | ⚠️ Igual: externalizar a worker + reintentos |
| 5 | `src/routes/socios.ts` — `createMembershipInvoiceInOdoo` | **`membership_membership_line` (create)** | Intenta crear "factura" con `move_type`, `partner_id`, `invoice_line_ids` | 🔴 **BUG crítico**: la factura es `account.move`; `membership.membership_line` es la línea de membresía generada por Odoo, no un modelo facturable vía API. No tiene campos `move_type`/`invoice_line_ids` |
| 6 | `src/routes/socios.ts` — `saveMembershipInvoiceLocal` | — (solo local) | Inserta/actualiza `db_pagos` y guarda `odoo_id` (que hoy es el id de `membership_membership_line` creado mal) | 🔴 Debe guardar el `move_id` real de `account.move` |
| 7 | `src/routes/pagos.ts` — `PUT /pagos/:id/pagar` | — (solo local) | Marca `estado='pagado'`, `metodo`, `fechaPago` en `db_pagos`. **No llama a Odoo** | 🔴 **Punto de intercepción principal** para el flujo de caja (factura + registro de pago en Odoo) |
| 8 | `src/routes/inscripciones.ts` — `POST /inscripciones` | — (solo local) | Crea `db_pagos` pendiente si el socio tiene `odooId` y hay precio | ⚠️ Debe encolar creación de `account.move` en Odoo (no solo si hay `nombreFiesta`) |
| 9 | `src/routes/actividades.ts` — `POST /actividades/:id/inscribir` | `res.partner` (search/create) | Crea pago local pendiente | ⚠️ Ídem: encolar invoice |
| 10 | `src/routes/delegado.ts` — `PATCH /delegado/inscripciones/:id` | — (solo local) | Marca pago `pagado` (efectivo/banco) y recalcula importe | ⚠️ Interceptar para registrar pago en Odoo |
| 11 | `src/routes/delegado.ts` — `POST /delegado/liquidacion` | — (solo local) | Liquida pagos en efectivo → banco/TPV/Bizum con referencia | ⚠️ Interceptar para registrar el pago (payment) en Odoo |
| 12 | `src/lib/sync.ts` — `syncPagos` | **`membership_membership_line` (search_read con `move_type`)** | Trae "facturas" desde el modelo equivocado y mapea a `db_pagos.odoo_id` | 🔴 **BUG crítico**: debe leer de `account.move` |
| 13 | `src/lib/sync.ts` — `syncSocios` | `res.partner`, `res.partner.category`, `membership.membership_line` | Pull completo de partners + membresías, upsert por `odoo_id` | ✅ Correcto en modelo; añadir campo `db_socios.partner_id` para claridad semántica |
| 14 | `src/routes/pagos.ts` — `resolveSocioIdForUser` | — (solo local) | `eq(sociosTable.odooId, user.uid)` | 🔴 **BUG de mapeo**: compara `res.users.id` (uid del JWT) contra `db_socios.odoo_id` (= `res.partner.id`). Son dominios de IDs distintos |

### 1.2 Hallazgos críticos (deben corregirse antes o durante la integración)

1. **Modelo erróneo para facturas:** `createMembershipInvoiceInOdoo` y `syncPagos` usan `membership_membership_line` como si fuera `account.move`. En Odoo las facturas se crean en `account.move` (`move_type='out_invoice'`) y el módulo *Membership* genera `membership.membership_line` automáticamente cuando la línea de factura usa un producto con servicio de membresía.
2. **Mezcla de identidades `res.users` vs `res.partner`:** el JWT transporta `uid = res.users.id`. Para facturar se necesita `partner_id`. Actualmente `resolveSocioIdForUser` compara `db_socios.odoo_id` con `user.uid`, lo que casi siempre devuelve `null` → el socio "no encuentra" sus pagos.
3. **`PUT /pagos/:id/pagar` no propaga a Odoo:** la factura queda `posted`/`draft` en Odoo pero nunca se registra el pago (ni `account.payment`, ni `invoice_payment_state`).
4. **`syncPagos` no enlaza `socio_id`:** las filas insertadas traen `odooId` pero `socioId` queda `null`, por lo que los pagos sincronizados no aparecen vinculados al socio local.
5. **Síncrono y sin reintentos:** todas las llamadas a Odoo están dentro del request HTTP. Una caída de Odoo o un timeout deja el alta/inscripción a medias (patrón *dual-write* sin compensación).

---

## 2. Estrategia de Mapeo de IDs

### 2.1 Principio: 1 columna por identidad Odoo (nunca reciclar `odoo_id`)

Las identidades de Odoo pertenecen a modelos distintos y **no son intercambiables**:

| Identidad Odoo | Modelo | Dónde debe vivir | Columna |
|---|---|---|---|
| `uid` | `res.users` | `db_users` | `odoo_uid` (ya existe ✅) |
| `partner_id` | `res.partner` | `db_socios` | **renombrar conceptualmente** `odoo_id` → `partner_id` |
| `move_id` | `account.move` | `db_pagos` | `move_id` (nueva) |
| `payment_id` | `account.payment` | `db_pagos` | `payment_id` (nueva) |
| `membership_line_id` | `membership.membership_line` | `db_socios` (opcional) | `membership_line_id` |
| `idempotency_key` | — (clave de negocio local) | `db_pagos` | `idempotency_key` |

### 2.2 Migración SQL (ejecutar como propietario/superusuario de la BD)

El script listo para ejecutar está en `lib/db/fix-db-odoo-integracion.sql`.

```sql
-- ============================================================
-- 1) db_socios: renombrar semántica de odoo_id → partner_id
-- ============================================================
ALTER TABLE db_socios
  RENAME COLUMN odoo_id TO partner_id;

ALTER TABLE db_socios
  ADD COLUMN IF NOT EXISTS membership_line_id integer,
  ADD COLUMN IF NOT EXISTS odoo_sync_status    varchar(30) NOT NULL DEFAULT 'pending',  -- pending|synced|failed
  ADD COLUMN IF NOT EXISTS odoo_sync_error     text,
  ADD COLUMN IF NOT EXISTS odoo_sync_attempts  integer NOT NULL DEFAULT 0;

-- Índice de resolución por partner
CREATE UNIQUE INDEX IF NOT EXISTS ux_db_socios_partner_id ON db_socios(partner_id) WHERE partner_id IS NOT NULL;

-- ============================================================
-- 2) db_pagos: separar move_id / payment_id
-- ============================================================
-- Conserva odoo_id durante la transición, luego se puede soltar.
ALTER TABLE db_pagos
  ADD COLUMN IF NOT EXISTS move_id      integer,
  ADD COLUMN IF NOT EXISTS payment_id   integer,
  ADD COLUMN IF NOT EXISTS idempotency_key varchar(64),
  ADD COLUMN IF NOT EXISTS odoo_sync_status    varchar(30) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS odoo_sync_error     text,
  ADD COLUMN IF NOT EXISTS odoo_sync_attempts  integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS ux_db_pagos_move_id     ON db_pagos(move_id)     WHERE move_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_db_pagos_idem_key    ON db_pagos(idempotency_key);

-- Backfill de migración: si odoo_id existente procedía de account.move, reubicarlo
UPDATE db_pagos SET move_id = odoo_id WHERE odoo_id IS NOT NULL AND move_id IS NULL;

-- ============================================================
-- 3) Tabla outbox (cola transaccional de eventos → Odoo)
-- ============================================================
CREATE TABLE IF NOT EXISTS db_odoo_outbox (
  id            bigserial PRIMARY KEY,
  entidad       varchar(30)  NOT NULL,            -- socio | pago
  operacion     varchar(30)  NOT NULL,            -- create_partner | update_partner | create_invoice | register_payment | post_invoice
  entidad_local_id bigint    NOT NULL,            -- db_socios.id | db_pagos.id
  payload       jsonb        NOT NULL,            -- snapshot de campos a enviar
  idempotency_key varchar(64),
  status        varchar(30)  NOT NULL DEFAULT 'pending',  -- pending|processing|done|failed|dead
  attempts      integer      NOT NULL DEFAULT 0,
  last_error    text,
  available_at  timestamptz  NOT NULL DEFAULT now(),
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_odoo_outbox_claim
  ON db_odoo_outbox (status, available_at, id)
  WHERE status IN ('pending','failed');

-- Log de intentos (auditoría)
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
```

### 2.3 Esquema objetivo (Drizzle, `lib/db/src/schema/`)

```ts
// lib/db/src/schema/pagos.ts (resumen de campos nuevos)
export const pagosTable = pgTable("db_pagos", {
  id: serial("id").primaryKey(),
  socioId: integer("socio_id"),
  inscripcionId: integer("inscripcion_id"),
  // IDs Odoo explícitos por modelo
  moveId: integer("move_id").unique(),        // account.move
  paymentId: integer("payment_id").unique(),  // account.payment
  idempotencyKey: varchar("idempotency_key", { length: 64 }).unique(),
  odooSyncStatus: varchar("odoo_sync_status", { length: 30 }).default("pending"),
  odooSyncError: text("odoo_sync_error"),
  odooSyncAttempts: integer("odoo_sync_attempts").default(0),
  // ...campos de negocio existentes (concepto, importe, metodo, estado, ...)
});

// lib/db/src/schema/socios.ts
export const sociosTable = pgTable("db_socios", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").unique(),   // res.partner
  membershipLineId: integer("membership_line_id"),
  odooSyncStatus: varchar("odoo_sync_status", { length: 30 }).default("pending"),
  odooSyncError: text("odoo_sync_error"),
  odooSyncAttempts: integer("odoo_sync_attempts").default(0),
  // ...resto de campos
});
```

### 2.4 Reglas de resolución de identidad

```ts
// lib/resolver.ts — único punto de verdad para traducir identidades
export type OdooIdentity = {
  uid?: number;          // res.users.id (JWT)
  partnerId?: number;    // res.partner.id
  moveId?: number;       // account.move.id
  paymentId?: number;    // account.payment.id
};

/** Dado el uid de res.users (JWT), devolver partner_id usando Odoo, con caché local en db_users. */
export async function resolvePartnerIdFromUid(uid: number): Promise<number | null> {
  // 1) Cache en db_users: columna partner_id (nueva, se añade en migración)
  // 2) Fallback: odooCall('res.users', 'read', [[uid], ['partner_id']])
}
```

---

## 3. Refactorización del Flujo de Caja (disparo asíncrono de `account.move`)

### 3.1 Flujo actual (problema)

```
PUT /pagos/:id/pagar
      └─ UPDATE db_pagos SET estado='pagado'   ← NUNCA toca Odoo
POST /inscripciones
      └─ INSERT db_pagos pendiente              ← factura NO existe en Odoo
POST /socios  (con membershipInvoice)
      └─ odooCall('membership_membership_line','create',{...})  ← modelo erróneo, síncrono
```

### 3.2 Flujo objetivo (outbox + worker, sin bloquear el request)

```
Cualquier endpoint que genere/modifique un cobro
      └─ (1) Transacción local: INSERT/UPDATE db_pagos
      └─ (2) Misma transacción: INSERT db_odoo_outbox (create_invoice | register_payment)
      └─ (3) HTTP 201/200 inmediato (fire-and-forget)

Worker de fondo (setInterval / cron / proceso aparte)
      └─ CLAIM: SELECT ... FOR UPDATE SKIP LOCKED de db_odoo_outbox (status='pending' y available_at<=now())
      └─ Ejecuta odooCall (account.move create → action_post → account.payment)
      └─ Éxito:  UPDATE db_pagos SET move_id/payment_id, odoo_sync_status='synced'
      └─ Error:  attempts++, last_error, available_at=now()+backoff; >3 → status='dead'
```

### 3.3 Interceptores concretos a modificar

| Endpoint | Acción de intercepción |
|---|---|
| `PUT /pagos/:id/pagar` (`pagos.ts`) | Marcar pago local + encolar `register_payment` (y `create_invoice` si `move_id` es null) |
| `POST /inscripciones` (`inscripciones.ts`) | Tras insertar `db_pagos` pendiente → encolar `create_invoice` |
| `POST /actividades/:id/inscribir` (`actividades.ts`) | Ídem → encolar `create_invoice` |
| `PATCH /delegado/inscripciones/:id` (`delegado.ts`) | Si estado pasa a `pagado` → encolar `register_payment` |
| `POST /delegado/liquidacion` (`delegado.ts`) | Al liquidar → encolar `register_payment` por pago afectado |
| `POST /socios` / `PUT /socios/:id` (`socios.ts`) | Sustituir `createMembershipInvoiceInOdoo` síncrono por enqueue en outbox |

### 3.4 Núcleo del worker (patrón probado)

```ts
// lib/odooFinance.ts — operaciones contables correctas contra account.move
import { odooCall } from "./odoo";

export async function createOutInvoice(payload: {
  partnerId: number;
  concepto: string;
  importe: number;
  fechaFactura?: string;
  fechaVencimiento?: string;
  ref?: string;
  journalId?: number;
  productId?: number;   // si se usa producto de membresía, Odoo crea la membership line
}): Promise<{ moveId: number; name?: string }> {
  const moveId = await odooCall("account.move", "create", [{
    move_type: "out_invoice",
    partner_id: payload.partnerId,
    invoice_date: payload.fechaFactura || new Date().toISOString().slice(0, 10),
    invoice_date_due: payload.fechaVencimiento || payload.fechaFactura,
    ref: payload.ref || false,
    invoice_line_ids: [[0, 0, {
      name: payload.concepto || "Cuota membresía",
      quantity: 1,
      price_unit: payload.importe,
      ...(payload.productId ? { product_id: payload.productId } : {}),
    }]],
  }]);

  const move = (await odooCall("account.move", "read", [[Number(moveId)], ["name", "state"]])) as Array<{ id: number; name: string; state: string }>;
  return { moveId: Number(moveId), name: move?.[0]?.name };
}

/** Valida y confirma la factura (draft → posted). */
export async function postInvoice(moveId: number): Promise<void> {
  const state = (await odooCall("account.move", "read", [[moveId], ["state"]])) as Array<{ state: string }>;
  if (state?.[0]?.state !== "posted") {
    await odooCall("account.move", "action_post", [[moveId]]);
  }
}

/** Registra el cobro: crea account.payment y lo concilia con la factura. */
export async function registerInvoicePayment(p: {
  moveId: number;
  partnerId: number;
  importe: number;
  metodo: string;            // 'transferencia' | 'tarjeta' | 'efectivo' | 'bizum' | 'tpv' | 'domiciliacion'
  fechaPago?: string;
  ref?: string;
}): Promise<number> {
  // Mapeo método web → journal de Odoo (configurar en db_config)
  const journalMap: Record<string, string> = {
    transferencia: "journal_bank",
    tarjeta: "journal_bank",
    bizum: "journal_bank",
    tpv: "journal_bank",
    efectivo: "journal_cash",
    domiciliacion: "journal_bank",
  };
  const payment = await odooCall("account.payment", "create", [{
    payment_type: "inbound",
    partner_id: p.partnerId,
    amount: p.importe,
    payment_date: p.fechaPago || new Date().toISOString().slice(0, 10),
    journal_id: journalMap[p.metodo] || "journal_bank",
    ref: p.ref || false,
    move_ids: [[6, 0, [p.moveId]]],
  }]);
  await odooCall("account.payment", "action_post", [[Number(payment)]]);
  return Number(payment);
}
```

```ts
// lib/outbox.ts — claim/procesamiento transaccional con SKIP LOCKED
import { pool } from "@workspace/db";
import { createOutInvoice, postInvoice, registerInvoicePayment } from "./odooFinance";

type OutboxRow = {
  id: number;
  entidad: string;
  operacion: string;
  entidad_local_id: number;
  payload: Record<string, unknown>;
  idempotency_key: string | null;
};

export async function claimBatch(limit = 10): Promise<OutboxRow[]> {
  const r = await pool.query(
    `UPDATE db_odoo_outbox o
        SET status='processing', updated_at=now()
      WHERE o.id IN (
        SELECT id FROM db_odoo_outbox
         WHERE status IN ('pending','failed') AND available_at <= now()
         ORDER BY id LIMIT $1
         FOR UPDATE SKIP LOCKED
      )
      RETURNING id, entidad, operacion, entidad_local_id, payload, idempotency_key`,
    [limit],
  );
  return r.rows.map((row) => ({ ...row, payload: row.payload ?? {} }));
}

export async function processOutboxRow(row: OutboxRow): Promise<void> {
  const log = async (status: string, resp?: unknown, err?: unknown) => {
    await pool.query(
      `INSERT INTO db_odoo_outbox_log(outbox_id, status, request, response, error, created_at)
       VALUES ($1,$2,$3,$4,$5,now())`,
      [row.id, status, JSON.stringify(row.payload), resp ? JSON.stringify(resp) : null, err ? String(err) : null],
    );
  };

  try {
    let result: unknown;
    switch (row.operacion) {
      case "create_invoice": {
        const { partnerId, concepto, importe, fechaFactura, fechaVencimiento, ref } = row.payload;
        const inv = await createOutInvoice({ partnerId: Number(partnerId), concepto: String(concepto), importe: Number(importe), fechaFactura, fechaVencimiento, ref });
        await postInvoice(inv.moveId);
        result = inv;
        await pool.query(
          `UPDATE db_pagos SET move_id=$1, odoo_sync_status='synced', odoo_sync_error=NULL, odoo_sync_attempts=0, updated_at=now() WHERE id=$2`,
          [inv.moveId, row.entidad_local_id],
        );
        break;
      }
      case "register_payment": {
        const { moveId, partnerId, importe, metodo, fechaPago, ref } = row.payload;
        const paymentId = await registerInvoicePayment({ moveId: Number(moveId), partnerId: Number(partnerId), importe: Number(importe), metodo: String(metodo), fechaPago, ref });
        result = { paymentId };
        await pool.query(
          `UPDATE db_pagos SET payment_id=$1, estado='pagado', odoo_sync_status='synced', odoo_sync_error=NULL, updated_at=now() WHERE id=$2`,
          [paymentId, row.entidad_local_id],
        );
        break;
      }
      case "create_partner": {
        const { nombre, email, telefono, direccion, poblacion, dni, numeroSocio } = row.payload;
        const partnerId = await odooCall("res.partner", "create", [{
          name: String(nombre), email: email || false, phone: telefono || false,
          street: direccion || false, city: poblacion || false, vat: dni || false, ref: numeroSocio || false,
        }]);
        await pool.query(`UPDATE db_socios SET partner_id=$1, odoo_sync_status='synced', odoo_sync_error=NULL, updated_at=now() WHERE id=$2`, [partnerId, row.entidad_local_id]);
        result = { partnerId };
        break;
      }
      default:
        throw new Error(`Operación no soportada: ${row.operacion}`);
    }

    await pool.query(`UPDATE db_odoo_outbox SET status='done', updated_at=now() WHERE id=$1`, [row.id]);
    await log("done", result);
  } catch (err) {
    const attempts = await pool.query(`UPDATE db_odoo_outbox SET attempts=attempts+1, last_error=$2, status=CASE WHEN attempts+1>=4 THEN 'dead' ELSE 'failed' END, available_at=now() + (attempts+1) * interval '1 minute', updated_at=now() WHERE id=$1 RETURNING attempts, status`, [row.id, String(err)]);
    await log(attempts.rows[0]?.status ?? "failed", undefined, err);
    // Idempotencia: si el error indica registro ya existente, conciliar en vez de reintentar
    if (/already|duplicate|unique/i.test(String(err))) {
      await reconcilePagoConOdoo(row.entidad_local_id);
    }
  }
}

/** Concilia un pago local con Odoo buscando por referencia/idempotency. */
export async function reconcilePagoConOdoo(pagoId: number): Promise<void> { /* ... */ }
```

```ts
// lib/outboxWorker.ts — arranque en index.ts (setInterval) o proceso separado
import { claimBatch, processOutboxRow } from "./outbox";

let running = false;
const POLL_MS = Number(process.env.ODOO_OUTBOX_POLL_MS ?? 5000);

export function startOutboxWorker(): void {
  setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const batch = await claimBatch(10);
      for (const row of batch) {
        await processOutboxRow(row);
      }
    } catch (err) {
      console.error("[outbox-worker]", err);
    } finally {
      running = false;
    }
  }, POLL_MS);
}

// src/index.ts: llamar startOutboxWorker() tras app.listen()
```

### 3.5 Cómo insertar el registro en el outbox desde los interceptores (helper común)

```ts
// lib/enqueue.ts
import { pool } from "@workspace/db";

export async function enqueueOdoo(op: {
  entidad: "socio" | "pago";
  operacion: "create_partner" | "update_partner" | "create_invoice" | "register_payment";
  entidadLocalId: number;
  payload: Record<string, unknown>;
}): Promise<void> {
  const idem = crypto.createHash("sha256")
    .update(`${op.entidad}:${op.entidadLocalId}:${op.operacion}`)
    .digest("hex").slice(0, 32);
  await pool.query(
    `INSERT INTO db_odoo_outbox (entidad, operacion, entidad_local_id, payload, idempotency_key)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (idempotency_key) DO NOTHING`,
    [op.entidad, op.operacion, op.entidadLocalId, JSON.stringify(op.payload), idem],
  );
}

// Ejemplo de intercepción en pagos.ts PUT /pagos/:id/pagar
await db.update(pagosTable).set({ estado: "pagado", metodo, fechaPago: new Date(), updatedAt: new Date() }).where(eq(pagosTable.id, id));
await enqueueOdoo({
  entidad: "pago",
  operacion: pago.moveId ? "register_payment" : "create_invoice",
  entidadLocalId: id,
  payload: {
    moveId: pago.moveId ?? undefined,
    partnerId: await getPartnerIdForPago(pago.socioId),
    importe: Number(pago.importe),
    metodo,
    fechaPago: new Date().toISOString().slice(0, 10),
    ref: `pago-${id}`,
  },
});
```

### 3.6 Corrección de `syncPagos` (leer de `account.move`, enlazar socio)

```ts
export async function syncPagos(): Promise<SyncResult> {
  const invoices = (await odooCall("account.move", "search_read", [
    [["move_type", "in", ["out_invoice", "out_refund"]], ["state", "!=", "cancel"]],
  ], {
    fields: ["id", "name", "partner_id", "amount_total", "payment_state", "invoice_date", "invoice_date_due", "ref"],
    limit: 500,
    order: "invoice_date desc",
  })) as Record<string, unknown>[];

  for (const inv of invoices) {
    const odooMoveId = Number(inv.id);
    const partnerId = Number(Array.isArray(inv.partner_id) ? inv.partner_id[0] : inv.partner_id ?? 0);
    const socioLocal = await db.select({ id: sociosTable.id })
      .from(sociosTable)
      .where(eq(sociosTable.partnerId, partnerId)).limit(1);

    await db.insert(pagosTable).values({
      moveId: odooMoveId,
      socioId: socioLocal[0]?.id ?? null,   // ← fija el bug de socioId null
      concepto: String(inv.name ?? ""),
      importe: String(Number(inv.amount_total ?? 0)),
      estado: inv.payment_state === "paid" ? "pagado" : "pendiente",
      odooSyncStatus: "synced",
      odooSyncedAt: new Date(),
    }).onConflictDoUpdate({ target: pagosTable.moveId, set: { /* ... */ } });
  }
}
```

### 3.7 Corrección de `resolveSocioIdForUser` (bug res.users vs res.partner)

```ts
async function resolveSocioIdForUser(user: Express.Request["user"]): Promise<number | null> {
  if (!user) return null;
  // 1) Vía db_users (más fiable): socio vinculado por socio_id o usuario_id
  const dbUser = await db.select({ socioId: usersTable.socioId })
    .from(usersTable).where(eq(usersTable.odooUid, user.uid)).limit(1);
  if (dbUser[0]?.socioId) return dbUser[0].socioId;

  // 2) Vía partner_id real del uid (res.users → res.partner), NO equiparar user.uid con partner_id
  const partnerId = await resolvePartnerIdFromUid(user.uid);
  if (partnerId) {
    const s = await db.select({ id: sociosTable.id })
      .from(sociosTable).where(eq(sociosTable.partnerId, partnerId)).limit(1);
    if (s[0]) return s[0].id;
  }

  // 3) Fallback por email
  const byEmail = await db.select({ id: sociosTable.id })
    .from(sociosTable).where(ilike(sociosTable.email, String(user.email ?? ""))).limit(1);
  return byEmail[0]?.id ?? null;
}
```

---

## 4. Plan de Migración recomendado

| Fase | Tareas | Riesgo |
|---|---|---|
| **F0 — Correcciones previas** | Arreglar `resolveSocioIdForUser`, `createMembershipInvoiceInOdoo` (→ `account.move`), `syncPagos` (→ `account.move` + `socio_id`). Añadir columnas de migración SQL. | 🔴 Crítico — sin esto nada funciona bien |
| **F1 — Outbox base** | Tablas `db_odoo_outbox` + `log` + helper `enqueueOdoo` + worker con reintentos. | 🟡 Medio |
| **F2 — Partners** | `POST/PUT /socios` pasan a encolar `create_partner`/`update_partner`. | 🟡 Medio |
| **F3 — Facturas** | `POST /inscripciones`, `POST /actividades/:id/inscribir`, alta de socio con cuota → encolar `create_invoice`. | 🟡 Medio |
| **F4 — Cobros** | `PUT /pagos/:id/pagar`, `PATCH /delegado/inscripciones/:id`, `POST /delegado/liquidacion` → encolar `register_payment`. | 🟡 Medio |
| **F5 — Conciliación** | Worker que compara `account.move.payment_state` vs `db_pagos.estado`; resolver pagos `dead` manualmente desde `/admin`. | 🟢 Bajo |
| **F6 — JSON-RPC opcional** | Capa `json-rpc` sobre el mismo `odooCall` para entornos donde XML-RPC esté deshabilitado. | 🟢 Bajo |

---

## 5. Anexo — Mapeo de campos (ultra-preciso)

### `db_socios` ↔ `res.partner`

| Campo local | Campo Odoo | Notas |
|---|---|---|
| `partner_id` | `res.partner.id` | FK externa (antes `odoo_id`) |
| `nombre` + `apellidos` | `name` | Concatenado `"Nombre Apellidos"` |
| `email` | `email` | |
| `telefono` | `phone` | |
| `direccion` | `street` | |
| `poblacion` | `city` | |
| `provincia` | `state_id` | id del estado/región, no texto |
| `dni` | `vat` | |
| `fechaNacimiento` | `birthdate_date` | |
| `genero` | `gender` | Odoo usa `male/female/other`; local usa `M/F/N` → traducir |
| `numeroSocio` | `ref` | |
| `tipologia` | `category_id` | etiquetas `res.partner.category` |
| `estado` | `active` + `customer_rank` | `active=false`→baja; `customer_rank>0`→activo |
| `membership*` | `membership.membership_line` / campos de partner | línea de membresía (no `account.move`) |

### `db_pagos` ↔ `account.move` / `account.payment`

| Campo local | Modelo Odoo | Campo Odoo | Notas |
|---|---|---|---|
| `move_id` | `account.move` | `id` | FK factura |
| `concepto` | `account.move` | `invoice_line_ids[0].name` | |
| `importe` | `account.move` | `invoice_line_ids[0].price_unit` | |
| `fechaPago` | `account.move` | `invoice_date` | |
| `referencia` | `account.move` | `ref` | |
| `estado` | `account.move` | `payment_state` | `paid/partial/not_paid` |
| `metodo` | `account.payment` | `journal_id` | mapear `transferencia|tarjeta|bizum|tpv|domiciliacion`→bank; `efectivo`→cash |
| `payment_id` | `account.payment` | `id` | FK pago registrado |

---

## 6. Checklist de verificación (para el test en `db-config-pegable.sql` / sandbox)

- [ ] Ejecutar migración SQL del apartado 2.2 contra la BD de test.
- [ ] Arrancar worker (`startOutboxWorker`) y confirmar poll cada 5 s.
- [ ] Crear un socio sin cuota → ver `db_odoo_outbox` fila `create_partner` → `done` y `db_socios.partner_id` poblado.
- [ ] Crear socio con cuota → `create_invoice` → `account.move` en Odoo en estado `posted`, `db_pagos.move_id` poblado.
- [ ] `PUT /pagos/:id/pagar` con `metodo=transferencia` → `register_payment` → `account.payment` `posted`, `db_pagos.payment_id` poblado y `estado='pagado'`.
- [ ] `POST /inscripciones` de fiesta con precio → factura creada y visible en `Mis pagos`.
- [ ] Apagar Odoo temporalmente → los requests no se bloquean; el outbox acumula `failed` y reintenta con backoff.
- [ ] `syncPagos` tras marcar pago → no duplica `db_pagos` (idempotencia por `move_id`).
- [ ] Login de socio → `resolveSocioIdForUser` resuelve correctamente (partner_id ≠ uid).
