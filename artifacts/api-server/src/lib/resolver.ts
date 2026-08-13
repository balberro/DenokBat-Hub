import { db, pool } from "@workspace/db";
import { sociosTable, usersTable } from "@workspace/db/schema";
import { eq, or, ilike, desc } from "drizzle-orm";
import { odooCall } from "./odoo";

/**
 * Resolución de identidades entre la app local y Odoo.
 *
 * Regla de oro: las identidades de Odoo NO son intercambiables.
 *   - `uid`        → res.users.id   (viaja en el JWT)
 *   - `partner_id` → res.partner.id (es lo que guarda db_socios.odoo_id)
 *   - `move_id`    → account.move.id
 *   - `payment_id` → account.payment.id
 *
 * Por eso NUNCA debe compararse `user.uid` contra `db_socios.odoo_id`:
 * son dominios de IDs distintos. Este módulo es el único punto de traducción.
 */

/** Dado el `uid` (res.users.id) del JWT, devuelve su `partner_id` (res.partner.id).
 *  Prioriza la caché local `db_users.partner_id` y consulta Odoo como fallback. */
export async function resolvePartnerIdFromUid(uid: number): Promise<number | null> {
  if (!Number.isFinite(uid) || uid <= 0) return null;

  // 1) Caché local (db_users.partner_id), si la columna existe.
  try {
    const r = await pool.query(
      `SELECT partner_id FROM db_users WHERE odoo_uid = $1 LIMIT 1`,
      [uid],
    );
    const cached = Number(r.rows[0]?.partner_id ?? 0);
    if (cached > 0) return cached;
  } catch {
    // Columna partner_id aún no creada: seguimos sin caché.
  }

  // 2) Consulta a Odoo: res.users → partner_id.
  try {
    const res = (await odooCall("res.users", "read", [[uid], ["partner_id"]])) as Array<{
      partner_id?: number | Array<number | string>;
    }>;
    const raw = res?.[0]?.partner_id;
    const partnerId = Array.isArray(raw) ? Number(raw[0]) : Number(raw ?? 0);
    if (Number.isFinite(partnerId) && partnerId > 0) {
      // 3) Cachear en db_users.partner_id (no rompe si la columna no existe).
      try {
        await pool.query(
          `UPDATE db_users SET partner_id = $1, updated_at = now() WHERE odoo_uid = $2`,
          [partnerId, uid],
        );
      } catch {
        //
      }
      return partnerId;
    }
  } catch {
    // Odoo no disponible: fallback a null.
  }

  return null;
}

/** Resuelve el `db_socios.id` del usuario autenticado.
 *  Orden de resolución (el primer acierto gana):
 *   1. Vínculo directo db_users.socio_id
 *   2. Vínculo inverso db_socios.usuario_id
 *   3. partner_id de Odoo (res.users → res.partner) contra db_socios.odoo_id  ← FIX del bug
 *   4. Coincidencia por email
 */
export async function resolveSocioIdForUser(user: Express.Request["user"]): Promise<number | null> {
  if (!user) return null;

  const dbUser = await db.select({
    id: usersTable.id,
    socioId: usersTable.socioId,
    email: usersTable.email,
  })
    .from(usersTable)
    .where(
      or(
        eq(usersTable.odooUid, user.uid),
        eq(usersTable.username, String(user.username ?? "")),
      ),
    )
    .orderBy(desc(usersTable.updatedAt))
    .limit(1);

  const dbUserId = Number(dbUser[0]?.id ?? 0) || null;
  const linkedSocioByUser = Number(dbUser[0]?.socioId ?? 0) || null;
  if (linkedSocioByUser) return linkedSocioByUser;

  if (dbUserId) {
    const byUsuarioId = await db.select({ id: sociosTable.id })
      .from(sociosTable)
      .where(eq(sociosTable.usuarioId, dbUserId))
      .limit(1);
    if (byUsuarioId.length > 0) return byUsuarioId[0].id;
  }

  // FIX: usar partner_id real (res.partner), no user.uid (res.users).
  const partnerId = await resolvePartnerIdFromUid(user.uid);
  if (partnerId) {
    const byOdoo = await db.select({ id: sociosTable.id })
      .from(sociosTable)
      .where(eq(sociosTable.odooId, partnerId))
      .limit(1);
    if (byOdoo.length > 0) return byOdoo[0].id;
  }

  const candidateEmail = String(user.email ?? dbUser[0]?.email ?? "").trim();
  if (candidateEmail) {
    const byEmail = await db.select({ id: sociosTable.id })
      .from(sociosTable)
      .where(ilike(sociosTable.email, candidateEmail))
      .limit(1);
    if (byEmail.length > 0) return byEmail[0].id;
  }

  return null;
}
