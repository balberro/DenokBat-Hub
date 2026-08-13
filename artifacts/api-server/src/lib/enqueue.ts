import { pool, db } from "@workspace/db";
import { pagosTable, sociosTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";

export type OutboxOperacion =
  | "create_partner"
  | "update_partner"
  | "create_invoice"
  | "register_payment";

export type OutboxEntidad = "socio" | "pago";

/** Inserta un evento en la cola transaccional db_odoo_outbox (idempotente). */
export async function enqueueOdoo(op: {
  entidad: OutboxEntidad;
  operacion: OutboxOperacion;
  entidadLocalId: number;
  payload: Record<string, unknown>;
}): Promise<void> {
  const idempotencyKey = createHash("sha256")
    .update(`${op.entidad}:${op.entidadLocalId}:${op.operacion}`)
    .digest("hex")
    .slice(0, 64);

  await pool.query(
    `INSERT INTO db_odoo_outbox (entidad, operacion, entidad_local_id, payload, idempotency_key)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (idempotency_key) DO NOTHING`,
    [op.entidad, op.operacion, op.entidadLocalId, JSON.stringify(op.payload), idempotencyKey],
  );
}

/**
 * Encola la facturación/cobro de un pago local en Odoo:
 *   - Sin move_id  → encola create_invoice (y auto-registra el pago si ya está 'pagado').
 *   - Con move_id y pago 'pagado' sin payment_id → encola register_payment.
 * Devuelve `true` si el evento quedó encolado (o no hacía falta), `false` si falló
 * (p. ej. la tabla outbox aún no existe). Los callers pueden usar el resultado para
 * hacer un fallback síncrono mientras la cola no esté migrada.
 */
export async function enqueuePagoToOdoo(pagoId: number): Promise<boolean> {
  try {
    const [pago] = await db.select().from(pagosTable).where(eq(pagosTable.id, pagoId)).limit(1);
    if (!pago) return true;

    const [socio] = pago.socioId != null
      ? await db.select({ odooId: sociosTable.odooId }).from(sociosTable)
          .where(eq(sociosTable.id, pago.socioId)).limit(1)
      : [];
    const partnerId = Number(socio?.odooId ?? 0) || null;
    if (!partnerId) return true; // sin partner en Odoo no se puede facturar (no es error)

    const pagado = String(pago.estado ?? "").trim().toLowerCase() === "pagado";
    const moveId = Number(pago.moveId ?? pago.odooId ?? 0) || null;
    const importe = Number(pago.importe ?? 0);
    const base = {
      partnerId,
      importe,
      concepto: String(pago.concepto ?? "Cuota"),
      metodo: String(pago.metodo ?? "transferencia"),
      ref: `pago-${pago.id}`,
    };

    if (!moveId) {
      await enqueueOdoo({
        entidad: "pago",
        operacion: "create_invoice",
        entidadLocalId: pago.id,
        payload: {
          ...base,
          fechaFactura: new Date().toISOString().slice(0, 10),
          autoRegistrarPago: pagado,
        },
      });
      return true;
    }

    if (pagado && !pago.paymentId) {
      await enqueueOdoo({
        entidad: "pago",
        operacion: "register_payment",
        entidadLocalId: pago.id,
        payload: { ...base, moveId },
      });
    }
    return true;
  } catch (err) {
    console.warn("[enqueuePagoToOdoo] No se pudo encolar pago", pagoId, String(err));
    return false;
  }
}
