import { pool } from "@workspace/db";
import { createOutInvoice, postInvoice, registerInvoicePayment, findInvoiceByRef } from "./odooFinance";

type OutboxRow = {
  id: number;
  entidad: string;
  operacion: string;
  entidad_local_id: number;
  payload: Record<string, unknown>;
  idempotency_key: string | null;
};

/** Reclama un lote de eventos pendientes usando FOR UPDATE SKIP LOCKED. */
export async function claimBatch(limit = 10): Promise<OutboxRow[]> {
  const r = await pool.query(
    `UPDATE db_odoo_outbox o
        SET status = 'processing', updated_at = now()
      WHERE o.id IN (
        SELECT id FROM db_odoo_outbox
         WHERE status IN ('pending','failed') AND available_at <= now()
         ORDER BY id LIMIT $1
         FOR UPDATE SKIP LOCKED
      )
      RETURNING id, entidad, operacion, entidad_local_id, payload, idempotency_key`,
    [limit],
  );
  return r.rows.map((row) => ({
    id: Number(row.id),
    entidad: String(row.entidad),
    operacion: String(row.operacion),
    entidad_local_id: Number(row.entidad_local_id),
    payload: (row.payload as Record<string, unknown>) ?? {},
    idempotency_key: row.idempotency_key != null ? String(row.idempotency_key) : null,
  }));
}

async function logAttempt(outboxId: number, status: string, request?: unknown, response?: unknown, error?: unknown): Promise<void> {
  await pool.query(
    `INSERT INTO db_odoo_outbox_log (outbox_id, status, request, response, error, created_at)
     VALUES ($1, $2, $3, $4, $5, now())`,
    [
      outboxId,
      status,
      request != null ? JSON.stringify(request) : null,
      response != null ? JSON.stringify(response) : null,
      error != null ? String(error) : null,
    ],
  );
}

/** Procesa un evento del outbox: ejecuta la operación en Odoo y actualiza el estado local. */
export async function processOutboxRow(row: OutboxRow): Promise<void> {
  try {
    let result: unknown;

    switch (row.operacion) {
      case "create_invoice": {
        const p = row.payload;
        const inv = await createOutInvoice({
          partnerId: Number(p.partnerId),
          concepto: String(p.concepto ?? "Cuota membresía"),
          importe: Number(p.importe ?? 0),
          fechaFactura: p.fechaFactura ? String(p.fechaFactura) : undefined,
          fechaVencimiento: p.fechaVencimiento ? String(p.fechaVencimiento) : undefined,
          ref: p.ref ? String(p.ref) : undefined,
        });
        await postInvoice(inv.moveId);
        result = inv;

        let paymentId: number | null = null;
        if (Boolean(p.autoRegistrarPago)) {
          paymentId = await registerInvoicePayment({
            moveId: inv.moveId,
            partnerId: Number(p.partnerId),
            importe: Number(p.importe ?? 0),
            metodo: String(p.metodo ?? "transferencia"),
            ref: p.ref ? String(p.ref) : undefined,
          });
        }

        await pool.query(
          `UPDATE db_pagos
              SET move_id = $1, odoo_id = $1, odoo_sync_status = 'synced',
                  odoo_sync_error = NULL, odoo_sync_attempts = 0,
                  payment_id = COALESCE($2, payment_id),
                  estado = CASE WHEN $3 THEN 'pagado' ELSE estado END,
                  updated_at = now()
            WHERE id = $4`,
          [inv.moveId, paymentId, Boolean(p.autoRegistrarPago), row.entidad_local_id],
        );
        break;
      }

      case "register_payment": {
        const p = row.payload;
        const moveId = Number(p.moveId ?? 0);
        if (!moveId) throw new Error("register_payment sin move_id");
        const paymentId = await registerInvoicePayment({
          moveId,
          partnerId: Number(p.partnerId),
          importe: Number(p.importe ?? 0),
          metodo: String(p.metodo ?? "transferencia"),
          fechaPago: p.fechaPago ? String(p.fechaPago) : undefined,
          ref: p.ref ? String(p.ref) : undefined,
        });
        result = { paymentId };

        await pool.query(
          `UPDATE db_pagos
              SET payment_id = $1, estado = 'pagado', odoo_sync_status = 'synced',
                  odoo_sync_error = NULL, odoo_sync_attempts = 0,
                  updated_at = now()
            WHERE id = $2`,
          [paymentId, row.entidad_local_id],
        );
        break;
      }

      case "create_partner":
      case "update_partner": {
        // La creación/actualización de partners sigue siendo síncrona en /socios;
        // este caso queda preparado para moverla al outbox en una fase posterior.
        throw new Error(`Operación ${row.operacion} aún no migrada al worker`);
      }

      default:
        throw new Error(`Operación no soportada: ${row.operacion}`);
    }

    await pool.query(`UPDATE db_odoo_outbox SET status='done', updated_at=now() WHERE id=$1`, [row.id]);
    await logAttempt(row.id, "done", row.payload, result);
  } catch (err) {
    const r = await pool.query(
      `UPDATE db_odoo_outbox
          SET attempts = attempts + 1,
              last_error = $2,
              status = CASE WHEN attempts + 1 >= 4 THEN 'dead' ELSE 'failed' END,
              available_at = now() + (attempts + 1) * interval '1 minute',
              updated_at = now()
        WHERE id = $1
        RETURNING attempts, status`,
      [row.id, String(err)],
    );
    const newStatus = r.rows[0]?.status ?? "failed";
    await logAttempt(row.id, newStatus, row.payload, undefined, err);

    // Idempotencia: si el error indica registro ya existente, reconciliar.
    if (/already|duplicate|unique|exists/i.test(String(err))) {
      await reconcilePagoConOdoo(row.entidad_local_id);
    }
  }
}

/** Concilia un pago local con Odoo buscando la factura por su referencia. */
export async function reconcilePagoConOdoo(pagoId: number): Promise<void> {
  try {
    const ref = `pago-${pagoId}`;
    const found = await findInvoiceByRef(ref);
    if (!found) return;

    const estado = found.paymentState === "paid" ? "pagado" : "pendiente";
    await pool.query(
      `UPDATE db_pagos
          SET move_id = $1, odoo_id = $1, odoo_sync_status = 'synced',
              estado = $2, odoo_sync_error = NULL, updated_at = now()
        WHERE id = $3`,
      [found.moveId, estado, pagoId],
    );
  } catch (err) {
    console.warn("[reconcilePagoConOdoo] falló", pagoId, String(err));
  }
}
