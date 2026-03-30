import { db } from "@workspace/db";
import { sociosTable, eventosTable, actividadesTable, pagosTable } from "@workspace/db/schema";
import { odooCall } from "./odoo";
import { eq } from "drizzle-orm";

export type SyncResult = {
  modelo: string;
  procesados: number;
  errores: number;
  mensaje?: string;
};

export async function syncSocios(): Promise<SyncResult> {
  try {
    const partners = (await odooCall("res.partner", "search_read", [
      [["customer_rank", ">", 0]],
    ], {
      fields: ["id", "name", "email", "phone", "street", "vat", "birthdate_date", "ref", "gender", "active"],
      limit: 500,
    })) as Record<string, unknown>[];

    if (!Array.isArray(partners) || partners.length === 0) {
      return { modelo: "socios", procesados: 0, errores: 0, mensaje: "No se encontraron socios en Odoo" };
    }

    let procesados = 0;
    let errores = 0;

    for (const p of partners) {
      try {
        const odooId = Number(p.id);
        const data = {
          odooId,
          nombre: String(p.name ?? ""),
          email: p.email ? String(p.email) : null,
          telefono: p.phone ? String(p.phone) : null,
          direccion: p.street ? String(p.street) : null,
          dni: p.vat ? String(p.vat) : null,
          fechaNacimiento: p.birthdate_date ? String(p.birthdate_date) : null,
          numeroSocio: p.ref ? String(p.ref) : null,
          genero: p.gender === "male" ? "M" : p.gender === "female" ? "F" : null,
          estado: p.active ? "activo" : "inactivo",
          odooSyncedAt: new Date(),
        };

        const existing = await db.select({ id: sociosTable.id }).from(sociosTable)
          .where(eq(sociosTable.odooId, odooId)).limit(1);

        if (existing.length > 0) {
          await db.update(sociosTable).set({ ...data, updatedAt: new Date() })
            .where(eq(sociosTable.odooId, odooId));
        } else {
          await db.insert(sociosTable).values(data);
        }
        procesados++;
      } catch {
        errores++;
      }
    }

    return { modelo: "socios", procesados, errores };
  } catch (err) {
    return { modelo: "socios", procesados: 0, errores: 1, mensaje: String(err) };
  }
}

export async function syncEventos(): Promise<SyncResult> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const eventos = (await odooCall("event.event", "search_read", [
      [["date_begin", ">=", today]],
    ], {
      fields: ["id", "name", "description", "date_begin", "date_end", "address_id", "seats_available", "seats_max", "stage_id"],
      limit: 200,
      order: "date_begin asc",
    })) as Record<string, unknown>[];

    if (!Array.isArray(eventos) || eventos.length === 0) {
      return { modelo: "eventos", procesados: 0, errores: 0, mensaje: "No se encontraron eventos en Odoo" };
    }

    let procesados = 0;
    let errores = 0;

    for (const e of eventos) {
      try {
        const odooId = Number(e.id);
        const data = {
          odooId,
          nombre: String(e.name ?? ""),
          descripcion: e.description ? String(e.description) : null,
          fechaInicio: new Date(String(e.date_begin)),
          fechaFin: e.date_end ? new Date(String(e.date_end)) : null,
          lugar: e.address_id ? String((e.address_id as unknown[])[1] ?? "") : null,
          plazasTotal: Number(e.seats_max ?? 0),
          plazasDisponibles: Number(e.seats_available ?? 0),
          estado: "publicado",
          odooSyncedAt: new Date(),
        };

        const existing = await db.select({ id: eventosTable.id }).from(eventosTable)
          .where(eq(eventosTable.odooId, odooId)).limit(1);

        if (existing.length > 0) {
          await db.update(eventosTable).set({ ...data, updatedAt: new Date() })
            .where(eq(eventosTable.odooId, odooId));
        } else {
          await db.insert(eventosTable).values(data);
        }
        procesados++;
      } catch {
        errores++;
      }
    }

    return { modelo: "eventos", procesados, errores };
  } catch (err) {
    return { modelo: "eventos", procesados: 0, errores: 1, mensaje: String(err) };
  }
}

export async function syncActividades(): Promise<SyncResult> {
  try {
    const actividades = (await odooCall("event.tag", "search_read", [
      [],
    ], {
      fields: ["id", "name", "category_id"],
      limit: 100,
    })) as Record<string, unknown>[];

    if (!Array.isArray(actividades) || actividades.length === 0) {
      return { modelo: "actividades", procesados: 0, errores: 0, mensaje: "No se encontraron actividades en Odoo" };
    }

    let procesados = 0;
    let errores = 0;

    for (const a of actividades) {
      try {
        const odooId = Number(a.id);
        const data = {
          odooId,
          nombre: String(a.name ?? ""),
          categoria: a.category_id ? String((a.category_id as unknown[])[1] ?? "") : null,
          estado: "disponible",
          odooSyncedAt: new Date(),
        };

        const existing = await db.select({ id: actividadesTable.id }).from(actividadesTable)
          .where(eq(actividadesTable.odooId, odooId)).limit(1);

        if (existing.length > 0) {
          await db.update(actividadesTable).set({ ...data, updatedAt: new Date() })
            .where(eq(actividadesTable.odooId, odooId));
        } else {
          await db.insert(actividadesTable).values(data);
        }
        procesados++;
      } catch {
        errores++;
      }
    }

    return { modelo: "actividades", procesados, errores };
  } catch (err) {
    return { modelo: "actividades", procesados: 0, errores: 1, mensaje: String(err) };
  }
}

export async function syncPagos(): Promise<SyncResult> {
  try {
    const invoices = (await odooCall("account.move", "search_read", [
      [["move_type", "in", ["out_invoice", "out_refund"]], ["state", "!=", "cancel"]],
    ], {
      fields: ["id", "name", "partner_id", "amount_total", "payment_state", "invoice_date", "invoice_date_due", "ref"],
      limit: 500,
      order: "invoice_date desc",
    })) as Record<string, unknown>[];

    if (!Array.isArray(invoices) || invoices.length === 0) {
      return { modelo: "pagos", procesados: 0, errores: 0, mensaje: "No se encontraron facturas en Odoo" };
    }

    let procesados = 0;
    let errores = 0;

    for (const inv of invoices) {
      try {
        const odooId = Number(inv.id);
        const estado = inv.payment_state === "paid" ? "pagado"
          : inv.payment_state === "partial" ? "parcial"
          : "pendiente";

        const data = {
          odooId,
          concepto: String(inv.name ?? ""),
          importe: String(Number(inv.amount_total ?? 0)),
          estado,
          fechaPago: inv.invoice_date ? new Date(String(inv.invoice_date)) : null,
          referencia: inv.ref ? String(inv.ref) : null,
          odooSyncedAt: new Date(),
        };

        const existing = await db.select({ id: pagosTable.id }).from(pagosTable)
          .where(eq(pagosTable.odooId, odooId)).limit(1);

        if (existing.length > 0) {
          await db.update(pagosTable).set({ ...data, updatedAt: new Date() })
            .where(eq(pagosTable.odooId, odooId));
        } else {
          await db.insert(pagosTable).values(data);
        }
        procesados++;
      } catch {
        errores++;
      }
    }

    return { modelo: "pagos", procesados, errores };
  } catch (err) {
    return { modelo: "pagos", procesados: 0, errores: 1, mensaje: String(err) };
  }
}

export async function syncAll(): Promise<SyncResult[]> {
  const results = await Promise.allSettled([
    syncSocios(),
    syncEventos(),
    syncActividades(),
    syncPagos(),
  ]);

  return results.map((r) =>
    r.status === "fulfilled" ? r.value : { modelo: "desconocido", procesados: 0, errores: 1, mensaje: String((r as PromiseRejectedResult).reason) }
  );
}
