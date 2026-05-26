import { db } from "@workspace/db";
import { sociosTable, eventosTable, actividadesTable, pagosTable } from "@workspace/db/schema";
import { odooCall } from "./odoo";
import { eq, sql } from "drizzle-orm";

export type SyncResult = {
  modelo: string;
  procesados: number;
  errores: number;
  mensaje?: string;
};

export async function syncSocios(): Promise<SyncResult> {
    const nullable = (value: unknown): string | null => {
      if (value === undefined || value === null) return null;
      if (typeof value === "boolean") return null;
      const s = String(value).trim();
      return s.length > 0 ? s : null;
    };
    const isHonorificoByBirthdate = (fechaNacimiento: string | null): boolean => {
      if (!fechaNacimiento) return false;
      const birth = new Date(`${fechaNacimiento}T00:00:00`);
      if (Number.isNaN(birth.getTime())) return false;
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const monthDiff = now.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--;
      return age >= 85;
    };

  try {
    const columnResult = await db.execute(sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'db_socios'
    `);
    const sociosColumns = new Map<string, string>();
    for (const row of columnResult.rows as Array<{ column_name?: string; data_type?: string }>) {
      const columnName = String(row.column_name ?? "");
      const dataType = String(row.data_type ?? "");
      if (columnName) sociosColumns.set(columnName, dataType);
    }
    const numeroSocioIsInteger = sociosColumns.get("numero_socio") === "integer";
    const hasMembershipEstado = sociosColumns.has("membership_estado");
    const hasMembershipDesde = sociosColumns.has("membership_desde");
    const hasMembershipHasta = sociosColumns.has("membership_hasta");
    const hasMembershipCuota = sociosColumns.has("membership_cuota");

    let membershipByPartner = new Map<number, {
      estado: string | null;
      desde: string | null;
      hasta: string | null;
      cuota: string | null;
    }>();
    try {
      const membershipLines = (await odooCall("membership.membership_line", "search_read", [
        [],
      ], {
        fields: ["partner", "state", "date_from", "date_to", "membership_amount", "create_date"],
        limit: 2000,
        order: "create_date desc",
      })) as Record<string, unknown>[];
      if (Array.isArray(membershipLines)) {
        for (const line of membershipLines) {
          const partnerField = line.partner as unknown;
          const partnerId = Array.isArray(partnerField) ? Number(partnerField[0] ?? 0) : 0;
          if (!partnerId || membershipByPartner.has(partnerId)) continue;
          membershipByPartner.set(partnerId, {
            estado: line.state ? String(line.state) : null,
            desde: line.date_from ? String(line.date_from) : null,
            hasta: line.date_to ? String(line.date_to) : null,
            cuota: line.membership_amount != null ? String(line.membership_amount) : null,
          });
        }
      }
    } catch {
      // En algunas instalaciones el modelo membership.membership_line no está disponible.
      membershipByPartner = new Map();
    }

    const partnerFields = [
      "id",
      "name",
      "email",
      "phone",
      "street",
      "city",
      "state_id",
      "vat",
      "birthdate_date",
      "ref",
      "gender",
      "active",
      "customer_rank",
      "category_id",
      "membership_state",
      "membership_start",
      "membership_stop",
      "membership_cancel",
      "membership_amount",
    ];
    let selectedFields = [...partnerFields];
    let partners: Record<string, unknown>[] = [];
    for (let attempt = 0; attempt < partnerFields.length; attempt += 1) {
      try {
        partners = (await odooCall("res.partner", "search_read", [
          [["customer_rank", ">", 0]],
        ], {
          fields: selectedFields,
          limit: 500,
        })) as Record<string, unknown>[];
        break;
      } catch (err) {
        const msg = String(err ?? "");
        const invalidFieldMatch = msg.match(/Invalid field '([^']+)' on 'res\.partner'/);
        const invalidField = invalidFieldMatch?.[1];
        if (!invalidField) throw err;
        selectedFields = selectedFields.filter((f) => f !== invalidField);
        if (selectedFields.length === 0) throw err;
      }
    }

    if (!Array.isArray(partners) || partners.length === 0) {
      return { modelo: "socios", procesados: 0, errores: 0, mensaje: "No se encontraron socios en Odoo" };
    }

    let procesados = 0;
    let errores = 0;
    let firstErrorMessage: string | null = null;

    for (const p of partners) {
      try {
        const odooId = Number(p.id);
        const line = membershipByPartner.get(odooId);
        const membershipEstado =
          (p.membership_state ? String(p.membership_state) : null)
          ?? line?.estado
          ?? null;
        const membershipDesde =
          (p.membership_start ? String(p.membership_start) : null)
          ?? line?.desde
          ?? null;
        const membershipHasta =
          (p.membership_stop ? String(p.membership_stop) : null)
          ?? (p.membership_cancel ? String(p.membership_cancel) : null)
          ?? line?.hasta
          ?? null;
        const membershipCuotaRaw =
          p.membership_amount != null ? String(p.membership_amount) : (line?.cuota ?? null);
        const membershipCuotaNumber = Number(membershipCuotaRaw);
        const fechaNacimiento = p.birthdate_date ? String(p.birthdate_date) : null;
        const categoryIds = Array.isArray(p.category_id) ? (p.category_id as number[]).map((x) => Number(x)).filter(Boolean) : [];
        let tipologia: "fundadora" | "directiva" | "delegada" | "honorifica" | "numeraria" | "colaboradora" = "numeraria";
        if (Array.isArray(p.category_id) && categoryIds.length > 0) {
          try {
            const tags = (await odooCall("res.partner.category", "search_read", [
              [["id", "in", categoryIds]],
            ], { fields: ["name"], limit: 50 })) as Record<string, unknown>[];
            const tagNames = tags.map((t) => String(t.name ?? "").trim().toLowerCase());
            if (tagNames.some((n) => n.includes("fundadora"))) tipologia = "fundadora";
            else if (tagNames.some((n) => n.includes("directiva"))) tipologia = "directiva";
            else if (tagNames.some((n) => n.includes("delegada"))) tipologia = "delegada";
            else if (tagNames.some((n) => n.includes("honorifica") || n.includes("honorífica"))) tipologia = "honorifica";
            else if (tagNames.some((n) => n.includes("colaboradora"))) tipologia = "colaboradora";
            else if (tagNames.some((n) => n.includes("numeraria"))) tipologia = "numeraria";
          } catch {
            // sin tags tipologia en Odoo, usamos fallback local por edad
          }
        }
        if (tipologia === "numeraria" && isHonorificoByBirthdate(fechaNacimiento)) {
          tipologia = "honorifica";
        }
        const customerRank = Number(p.customer_rank ?? 0);
        const estado = p.active
          ? (customerRank > 0 ? "activo" : "solicitante")
          : "baja";
        const numeroSocioRaw = nullable(p.ref);
        const numeroSocioValue = numeroSocioIsInteger
          ? ((Number.isFinite(Number(numeroSocioRaw)) ? Number(numeroSocioRaw) : null) as number | null)
          : numeroSocioRaw;

        const data: Record<string, unknown> = {
          odooId,
          nombre: String(p.name ?? ""),
          email: nullable(p.email),
          telefono: nullable(p.phone),
          direccion: nullable(p.street),
          poblacion: nullable(p.city),
          provincia: Array.isArray(p.state_id) ? nullable(p.state_id[1]) : null,
          dni: nullable(p.vat),
          fechaNacimiento: nullable(fechaNacimiento),
          tipoSocio: tipologia === "honorifica" ? "honorifico" : "ordinario",
          tipologia,
          numeroSocio: numeroSocioValue,
          genero: p.gender === "male" ? "M" : p.gender === "female" ? "F" : null,
          estado,
          odooSyncedAt: new Date(),
        };
        if (hasMembershipEstado) data.membershipEstado = nullable(membershipEstado);
        if (hasMembershipDesde) data.membershipDesde = nullable(membershipDesde);
        if (hasMembershipHasta) data.membershipHasta = nullable(membershipHasta);
        if (hasMembershipCuota) data.membershipCuota = Number.isFinite(membershipCuotaNumber) ? String(membershipCuotaNumber) : null;

        const existing = await db.select({ id: sociosTable.id }).from(sociosTable)
          .where(eq(sociosTable.odooId, odooId)).limit(1);

        if (existing.length > 0) {
          await db.update(sociosTable).set({ ...data, updatedAt: new Date() })
            .where(eq(sociosTable.odooId, odooId));
        } else {
          await db.insert(sociosTable).values(data);
        }
        procesados++;
      } catch (err) {
        errores++;
        if (!firstErrorMessage) firstErrorMessage = String(err);
      }
    }

    return {
      modelo: "socios",
      procesados,
      errores,
      ...(firstErrorMessage ? { mensaje: firstErrorMessage } : {}),
    };
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
    const invoices = (await odooCall("membership_membership_line", "search_read", [
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
