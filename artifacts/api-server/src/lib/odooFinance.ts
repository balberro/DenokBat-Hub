import { odooCall } from "./odoo";

/**
 * Operaciones contables contra Odoo usando los modelos CORRECTOS:
 *   - account.move       (facturas de cliente: move_type='out_invoice')
 *   - account.payment    (cobros)
 *   - account.journal    (diarios)
 *
 * Nota: `membership.membership_line` es la LÍNEA de membresía que Odoo crea
 * automáticamente al facturar un producto con servicio de membresía; NO se
 * usa aquí para crear facturas.
 */

/** Resuelve el id numérico de un diario contable. Prefiere banco/caja según método. */
async function resolveJournalId(metodo: string): Promise<number> {
  const isCash = ["efectivo", "cash"].includes(String(metodo ?? "").toLowerCase());
  const wantedType = isCash ? "cash" : "bank";

  // 1) Buscar por tipo exacto (bank|cash).
  try {
    const journals = (await odooCall("account.journal", "search_read", [
      [["type", "=", wantedType]],
    ], {
      fields: ["id", "name"],
      limit: 1,
    })) as Record<string, unknown>[];
    if (Array.isArray(journals) && journals.length > 0) {
      return Number(journals[0].id);
    }
  } catch {
    //
  }

  // 2) Fallback: cualquier diario de ventas/ingresos.
  try {
    const journals = (await odooCall("account.journal", "search_read", [
      [["type", "in", ["sale", "bank", "cash"]]],
    ], {
      fields: ["id"],
      limit: 1,
    })) as Record<string, unknown>[];
    if (Array.isArray(journals) && journals.length > 0) {
      return Number(journals[0].id);
    }
  } catch {
    //
  }

  throw new Error("No se encontró ningún diario contable válido en Odoo");
}

/** Crea una factura de cliente (account.move, out_invoice) y devuelve su id. */
export async function createOutInvoice(payload: {
  partnerId: number;
  concepto: string;
  importe: number;
  fechaFactura?: string;
  fechaVencimiento?: string;
  ref?: string;
  journalId?: number;
  productId?: number;
}): Promise<{ moveId: number; name?: string }> {
  const journalId = payload.journalId ?? (await resolveJournalId("transferencia"));

  const moveId = await odooCall("account.move", "create", [{
    move_type: "out_invoice",
    partner_id: payload.partnerId,
    invoice_date: payload.fechaFactura || new Date().toISOString().slice(0, 10),
    invoice_date_due: payload.fechaVencimiento || payload.fechaFactura || false,
    journal_id: journalId,
    ref: payload.ref || false,
    invoice_line_ids: [[0, 0, {
      name: payload.concepto || "Cuota membresía",
      quantity: 1,
      price_unit: payload.importe,
      ...(payload.productId ? { product_id: payload.productId } : {}),
    }]],
  }]);

  const numericMoveId = Number(moveId ?? 0) || null;
  if (!numericMoveId) {
    throw new Error("Odoo no devolvió un id válido al crear account.move");
  }

  // Leer el nombre/estado para devolver datos útiles.
  let name: string | undefined;
  try {
    const move = (await odooCall("account.move", "read", [[numericMoveId], ["name", "state"]])) as Array<{
      name?: string;
      state?: string;
    }>;
    name = move?.[0]?.name;
  } catch {
    //
  }

  return { moveId: numericMoveId, name };
}

/** Confirma la factura: draft → posted. */
export async function postInvoice(moveId: number): Promise<void> {
  const state = (await odooCall("account.move", "read", [[moveId], ["state"]])) as Array<{ state?: string }>;
  const current = state?.[0]?.state;
  if (current === "posted") return;
  await odooCall("account.move", "action_post", [[moveId]]);
}

/** Registra un cobro: crea account.payment (inbound) y lo confirma (action_post). */
export async function registerInvoicePayment(p: {
  moveId: number;
  partnerId: number;
  importe: number;
  metodo: string; // 'transferencia' | 'tarjeta' | 'efectivo' | 'bizum' | 'tpv' | 'domiciliacion'
  fechaPago?: string;
  ref?: string;
}): Promise<number> {
  const journalId = await resolveJournalId(p.metodo);

  const paymentId = await odooCall("account.payment", "create", [{
    payment_type: "inbound",
    partner_id: p.partnerId,
    amount: p.importe,
    payment_date: p.fechaPago || new Date().toISOString().slice(0, 10),
    journal_id: journalId,
    ref: p.ref || false,
    move_ids: [[6, 0, [p.moveId]]],
  }]);

  const numericPaymentId = Number(paymentId ?? 0) || null;
  if (!numericPaymentId) {
    throw new Error("Odoo no devolvió un id válido al crear account.payment");
  }

  await odooCall("account.payment", "action_post", [[numericPaymentId]]);
  return numericPaymentId;
}

/** Concilia un pago local con Odoo buscando la factura por su referencia (`pago-<id>`). */
export async function findInvoiceByRef(ref: string): Promise<{ moveId: number; paymentState?: string } | null> {
  try {
    const moves = (await odooCall("account.move", "search_read", [
      [["move_type", "=", "out_invoice"], ["ref", "=", ref]],
    ], {
      fields: ["id", "payment_state"],
      limit: 1,
    })) as Record<string, unknown>[];
    if (!Array.isArray(moves) || moves.length === 0) return null;
    return {
      moveId: Number(moves[0].id),
      paymentState: moves[0].payment_state ? String(moves[0].payment_state) : undefined,
    };
  } catch {
    return null;
  }
}
