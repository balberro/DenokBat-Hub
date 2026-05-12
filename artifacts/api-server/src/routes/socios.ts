import { Router, type IRouter } from "express";
import { db, pool } from "@workspace/db";
import { pagosTable, sociosTable, usersTable } from "@workspace/db/schema";
import { getPrimaryRole, getUserRoles, setUserRoles } from "../lib/roles";
import { requireAuth } from "../middlewares/auth";
import { eq, ilike, or, desc } from "drizzle-orm";
import { odooCall } from "../lib/odoo";
import { syncSocios } from "../lib/sync";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const router: IRouter = Router();

/** Alineado con `/admin/socios` (AreaPrivada): contable puede listar socios y tramitar solicitudes de alta. */
const SOCIOS_GESTION_ROLES = ["administrador", "directivo", "delegado", "contable"] as const;

function nullIfEmpty(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

function inferImageExtensionFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "bin";
}

function extractBase64ImageFromDataUrl(value: unknown): string | null {
  const raw = nullIfEmpty(value);
  if (!raw || !raw.startsWith("data:")) return null;
  const match = raw.match(/^data:image\/[^;]+;base64,(.+)$/);
  return match?.[1] ?? null;
}

function isHonorificoByBirthdate(fechaNacimiento: string | null): boolean {
  if (!fechaNacimiento) return false;
  const birth = new Date(`${fechaNacimiento}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return false;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--;
  return age >= 85;
}

function normalizeTipoSocio(input: unknown, fechaNacimiento: string | null): "ordinario" | "honorifico" {
  if (isHonorificoByBirthdate(fechaNacimiento)) return "honorifico";
  const raw = String(input ?? "").trim().toLowerCase();
  return raw === "honorifico" ? "honorifico" : "ordinario";
}

const TIPOLOGIAS = new Set(["fundadora", "directiva", "delegada", "honorifica", "numeraria", "colaboradora"]);

function normalizeTipologia(input: unknown, fechaNacimiento: string | null): "fundadora" | "directiva" | "delegada" | "honorifica" | "numeraria" | "colaboradora" {
  if (isHonorificoByBirthdate(fechaNacimiento)) return "honorifica";
  const raw = String(input ?? "").trim().toLowerCase();
  if (TIPOLOGIAS.has(raw)) return raw as "fundadora" | "directiva" | "delegada" | "honorifica" | "numeraria" | "colaboradora";
  return "numeraria";
}

function normalizeEstado(input: unknown): "solicitante" | "activo" | "baja" | "pendiente_datos" | "rechazado" {
  const raw = String(input ?? "").trim().toLowerCase();
  if (raw === "activo") return "activo";
  if (raw === "baja" || raw === "inactivo") return "baja";
  if (raw === "pendiente_datos" || raw === "pendiente_completar" || raw === "pendiente completar datos") {
    return "pendiente_datos";
  }
  if (raw === "rechazado" || raw === "rechazo") return "rechazado";
  return "solicitante";
}

function isEstadoPendienteRevision(estado: string): boolean {
  const e = String(estado ?? "").trim().toLowerCase();
  return e === "solicitante" || e === "pendiente_datos";
}

async function ensureSolicitudRevisionColumns(): Promise<void> {
  try {
    await pool.query(`
      ALTER TABLE db_socios
      ADD COLUMN IF NOT EXISTS solicitud_revision_campos text,
      ADD COLUMN IF NOT EXISTS solicitud_revision_mensaje text
    `);
  } catch {
    //
  }
}

function normalizeGeneroForStorage(input: unknown): "H" | "F" | "N" | null {
  if (input === undefined || input === null) return null;
  const raw = String(input).trim().toLowerCase();
  if (!raw) return null;
  if (raw === "h" || raw === "hombre" || raw === "male" || raw === "masculino") return "H";
  if (raw === "f" || raw === "mujer" || raw === "female" || raw === "femenino") return "F";
  if (raw === "n" || raw === "x" || raw === "na" || raw === "no informado") return "N";
  if (raw === "m") {
    throw new Error("Genero 'M' ambiguo. Usa H, F o N.");
  }
  throw new Error(`Genero no válido: ${raw}. Usa H, F o N.`);
}

const TIPOLOGIA_TO_ODOO_TAG: Record<string, string> = {
  fundadora: "Fundadora",
  directiva: "Directiva",
  delegada: "Delegada",
  honorifica: "Honorifica",
  numeraria: "Numeraria",
  colaboradora: "Colaboradora",
};

async function resolveOdooTipologiaTagId(tipologia: string): Promise<number | null> {
  const tagName = TIPOLOGIA_TO_ODOO_TAG[tipologia];
  if (!tagName) return null;
  try {
    const tags = (await odooCall("res.partner.category", "search_read", [
      [["name", "=", tagName]],
    ], {
      fields: ["id", "name"],
      limit: 1,
    })) as Record<string, unknown>[];
    if (!Array.isArray(tags) || tags.length === 0) return null;
    return Number(tags[0].id ?? 0) || null;
  } catch {
    return null;
  }
}

async function persistSocioAvatarIfNeeded(value: unknown): Promise<string | null> {
  const url = nullIfEmpty(value);
  if (!url) return null;
  if (!url.startsWith("data:")) return url;
  const match = url.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return url;
  const mime = match[1];
  const base64 = match[2];
  const ext = inferImageExtensionFromMime(mime);
  const fileName = `avatar-${Date.now()}-${randomUUID()}.${ext}`;
  const uploadsDir = path.resolve(process.cwd(), "artifacts/api-server/uploads/socios");
  await mkdir(uploadsDir, { recursive: true });
  const absPath = path.join(uploadsDir, fileName);
  await writeFile(absPath, Buffer.from(base64, "base64"));
  return `/uploads/socios/${fileName}`;
}

type MembershipInvoicePayload = {
  pagoId?: number;
  concepto?: string;
  importe?: string | number;
  fechaFactura?: string;
  fechaVencimiento?: string;
  estado?: string;
  metodo?: string;
  referencia?: string;
  crearEnOdoo?: boolean;
};

async function createMembershipInvoiceInOdoo(input: {
  partnerOdooId: number;
  concepto: string;
  importe: number;
  fechaFactura?: string;
  fechaVencimiento?: string;
  referencia?: string;
}): Promise<number | null> {
  try {
    const moveId = await odooCall("membership_membership_line", "create", [{
      move_type: "out_invoice",
      partner_id: input.partnerOdooId,
      invoice_date: input.fechaFactura || false,
      invoice_date_due: input.fechaVencimiento || false,
      ref: input.referencia || false,
      invoice_line_ids: [[0, 0, {
        name: input.concepto || "Cuota membresía",
        quantity: 1,
        price_unit: input.importe,
      }]],
    }]);
    return Number(moveId ?? 0) || null;
  } catch {
    return null;
  }
}

async function saveMembershipInvoiceLocal(socioId: number, payload: MembershipInvoicePayload, odooMoveId: number | null) {
  const concepto = String(payload.concepto ?? "Cuota membresía").trim() || "Cuota membresía";
  const importe = Number(payload.importe ?? 0);
  const referencia = String(payload.referencia ?? "").trim() || null;
  const estado = String(payload.estado ?? "pendiente").trim() || "pendiente";
  const metodo = String(payload.metodo ?? "").trim() || null;
  const fechaPago = estado === "pagado"
    ? (payload.fechaFactura ? new Date(payload.fechaFactura) : new Date())
    : null;

  if (payload.pagoId) {
    await db.update(pagosTable).set({
      ...(Number.isFinite(importe) && { importe: String(importe) }),
      concepto,
      metodo,
      estado,
      referencia,
      fechaPago,
      ...(odooMoveId ? { odooId: odooMoveId } : {}),
      updatedAt: new Date(),
    }).where(eq(pagosTable.id, Number(payload.pagoId)));
    const [updated] = await db.select().from(pagosTable).where(eq(pagosTable.id, Number(payload.pagoId))).limit(1);
    return updated ?? null;
  }

  const [inserted] = await db.insert(pagosTable).values({
    socioId,
    concepto,
    importe: Number.isFinite(importe) ? String(importe) : "0",
    metodo,
    estado,
    referencia,
    fechaPago,
    odooId: odooMoveId,
    odooSyncedAt: odooMoveId ? new Date() : null,
  }).returning();
  return inserted ?? null;
}

router.get("/socios", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!(SOCIOS_GESTION_ROLES as readonly string[]).includes(user.role)) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }

  const { page = "1", limit = "20", q } = req.query;
  const rawPage = parseInt(String(page), 10);
  const rawLimit = parseInt(String(limit), 10);
  const pageNum = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1;
  const limitNum = Number.isFinite(rawLimit) ? Math.max(1, Math.min(100, rawLimit)) : 20;
  const offset = (pageNum - 1) * limitNum;

  try {
    const where = q
      ? or(
          ilike(sociosTable.nombre, `%${q}%`),
          ilike(sociosTable.apellidos, `%${q}%`),
          ilike(sociosTable.email, `%${q}%`),
          ilike(sociosTable.numeroSocio, `%${q}%`)
        )
      : undefined;

    // Compatibilidad con BDs antiguas que aún no tienen tipo_socio/tipologia/membership_*.
    const baseQuery = db.select({
      id: sociosTable.id,
      odooId: sociosTable.odooId,
      nombre: sociosTable.nombre,
      apellidos: sociosTable.apellidos,
      email: sociosTable.email,
      telefono: sociosTable.telefono,
      direccion: sociosTable.direccion,
      poblacion: sociosTable.poblacion,
      provincia: sociosTable.provincia,
      dni: sociosTable.dni,
      fechaNacimiento: sociosTable.fechaNacimiento,
      fechaFallecimiento: sociosTable.fechaFallecimiento,
      fechaAlta: sociosTable.fechaAlta,
      numeroSocio: sociosTable.numeroSocio,
      genero: sociosTable.genero,
      estado: sociosTable.estado,
      tipologia: sociosTable.tipologia,
      grupoId: sociosTable.grupoId,
      avatarUrl: sociosTable.avatarUrl,
      odooSyncedAt: sociosTable.odooSyncedAt,
      createdAt: sociosTable.createdAt,
      updatedAt: sociosTable.updatedAt,
    }).from(sociosTable);
    // Orden estable para paginación con offset (evita repetidos entre páginas).
    const rows = where
      ? await baseQuery.where(where).orderBy(desc(sociosTable.createdAt), desc(sociosTable.id)).limit(limitNum).offset(offset)
      : await baseQuery.orderBy(desc(sociosTable.createdAt), desc(sociosTable.id)).limit(limitNum).offset(offset);

    const total = rows.length; // simplified count

    res.json({ items: rows, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error("[GET /socios] Error consultando socios:", err);
    const detail = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Error consultando socios", detalle: detail });
  }
});

/** Listado de solicitudes de alta (estado solicitante o pendiente de datos). */
router.get("/socios/solicitudes", requireAuth, async (_req, res): Promise<void> => {
  const user = _req.user!;
  if (!(SOCIOS_GESTION_ROLES as readonly string[]).includes(user.role)) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }

  await ensureSolicitudRevisionColumns();

  try {
    const r = await pool.query(
      `
      SELECT
        s.id,
        s.nombre,
        s.apellidos,
        s.email,
        s.telefono,
        s.estado,
        s.usuario_id,
        s.created_at,
        s.updated_at,
        s.solicitud_revision_mensaje,
        s.solicitud_revision_campos,
        u.username AS usuario_username
      FROM db_socios s
      LEFT JOIN db_users u ON u.id = s.usuario_id
      WHERE lower(trim(COALESCE(s.estado, ''))) IN ('solicitante', 'pendiente_datos')
      ORDER BY s.updated_at DESC NULLS LAST, s.id DESC
      `,
    );
    res.json({
      items: r.rows.map((row) => ({
        id: Number(row.id ?? 0),
        nombre: String(row.nombre ?? ""),
        apellidos: row.apellidos != null ? String(row.apellidos) : null,
        email: row.email != null ? String(row.email) : null,
        telefono: row.telefono != null ? String(row.telefono) : null,
        estado: String(row.estado ?? "").trim(),
        usuarioId: row.usuario_id != null ? Number(row.usuario_id) : null,
        usuarioUsername: row.usuario_username != null ? String(row.usuario_username) : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        solicitudRevisionMensaje: row.solicitud_revision_mensaje != null ? String(row.solicitud_revision_mensaje) : null,
        solicitudRevisionCampos: row.solicitud_revision_campos != null ? String(row.solicitud_revision_campos) : null,
      })),
    });
  } catch (err) {
    console.error("[GET /socios/solicitudes]", err);
    res.status(500).json({ error: "Error listando solicitudes", detalle: String(err) });
  }
});

router.patch("/socios/:id/solicitud", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!(SOCIOS_GESTION_ROLES as readonly string[]).includes(user.role)) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }

  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const accion = String(req.body?.accion ?? "").trim().toLowerCase();
  const mensajeRevision = String(req.body?.mensaje_revision ?? req.body?.mensaje ?? "").trim();
  const camposRaw = req.body?.campos_revision ?? req.body?.campos;
  let camposRevision: string[] = [];
  if (Array.isArray(camposRaw)) {
    camposRevision = camposRaw.map((c) => String(c ?? "").trim()).filter(Boolean);
  }

  if (!["admitir", "rechazar", "pendiente_datos"].includes(accion)) {
    res.status(400).json({ error: "accion debe ser admitir, rechazar o pendiente_datos" });
    return;
  }

  if (accion === "pendiente_datos" && camposRevision.length === 0) {
    res.status(400).json({ error: "Indique al menos un campo a corregir (campos_revision)." });
    return;
  }

  await ensureSolicitudRevisionColumns();

  try {
    const cur = await pool.query(
      `SELECT id, estado, usuario_id FROM db_socios WHERE id = $1`,
      [id],
    );
    if (cur.rows.length === 0) {
      res.status(404).json({ error: "Socio no encontrado" });
      return;
    }
    const estadoActual = String(cur.rows[0].estado ?? "").trim().toLowerCase();
    const usuarioSocio = cur.rows[0].usuario_id != null ? Number(cur.rows[0].usuario_id) : null;
    if (!isEstadoPendienteRevision(estadoActual)) {
      res.status(400).json({ error: "Esta ficha no está en revisión de solicitud." });
      return;
    }

    if (accion === "admitir") {
      const up = await pool.query(
        `
        UPDATE db_socios
        SET
          estado = 'activo',
          solicitud_revision_campos = NULL,
          solicitud_revision_mensaje = NULL,
          fecha_alta = COALESCE(fecha_alta, CURRENT_DATE),
          updated_at = now()
        WHERE id = $1 AND estado IN ('solicitante', 'pendiente_datos')
        RETURNING id, usuario_id
        `,
        [id],
      );
      if (up.rows.length === 0) {
        res.status(400).json({ error: "No se pudo admitir la solicitud." });
        return;
      }
      const uid = up.rows[0].usuario_id != null ? Number(up.rows[0].usuario_id) : usuarioSocio;
      if (uid && Number.isFinite(uid)) {
        const [urow] = await db.select({ rol: usersTable.rol }).from(usersTable).where(eq(usersTable.id, uid)).limit(1);
        const roles = await getUserRoles(uid, urow?.rol ?? null);
        const next = Array.from(new Set([...roles, "socio"]));
        const persisted = await setUserRoles(uid, next);
        const primary = getPrimaryRole(persisted);
        await db.update(usersTable).set({
          rol: primary,
          socioId: id,
          updatedAt: new Date(),
        }).where(eq(usersTable.id, uid));
      }
      res.json({ ok: true, estado: "activo" });
      return;
    }

    if (accion === "rechazar") {
      await pool.query(
        `
        UPDATE db_socios
        SET
          estado = 'rechazado',
          solicitud_revision_campos = NULL,
          solicitud_revision_mensaje = NULL,
          updated_at = now()
        WHERE id = $1 AND estado IN ('solicitante', 'pendiente_datos')
        `,
        [id],
      );
      res.json({ ok: true, estado: "rechazado" });
      return;
    }

    const camposJson = JSON.stringify(camposRevision);
    await pool.query(
      `
      UPDATE db_socios
      SET
        estado = 'pendiente_datos',
        solicitud_revision_campos = $2,
        solicitud_revision_mensaje = $3,
        updated_at = now()
      WHERE id = $1 AND estado IN ('solicitante', 'pendiente_datos')
      `,
      [id, camposJson, mensajeRevision || null],
    );
    res.json({ ok: true, estado: "pendiente_datos", campos_revision: camposRevision });
  } catch (err) {
    console.error("[PATCH /socios/:id/solicitud]", err);
    res.status(500).json({ error: "Error actualizando solicitud", detalle: String(err) });
  }
});

router.get("/socios/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!(SOCIOS_GESTION_ROLES as readonly string[]).includes(user.role)) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }

  const id = parseInt(String(req.params.id), 10);
  try {
    const rows = await db.select({
      id: sociosTable.id,
      odooId: sociosTable.odooId,
      nombre: sociosTable.nombre,
      apellidos: sociosTable.apellidos,
      email: sociosTable.email,
      telefono: sociosTable.telefono,
      direccion: sociosTable.direccion,
      poblacion: sociosTable.poblacion,
      provincia: sociosTable.provincia,
      dni: sociosTable.dni,
      fechaNacimiento: sociosTable.fechaNacimiento,
      fechaFallecimiento: sociosTable.fechaFallecimiento,
      fechaAlta: sociosTable.fechaAlta,
      numeroSocio: sociosTable.numeroSocio,
      genero: sociosTable.genero,
      estado: sociosTable.estado,
      tipologia: sociosTable.tipologia,
      grupoId: sociosTable.grupoId,
      avatarUrl: sociosTable.avatarUrl,
      odooSyncedAt: sociosTable.odooSyncedAt,
      createdAt: sociosTable.createdAt,
      updatedAt: sociosTable.updatedAt,
    }).from(sociosTable).where(eq(sociosTable.id, id)).limit(1);
    if (rows.length === 0) {
      res.status(404).json({ error: "Socio no encontrado" });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error consultando socio", detalle: String(err) });
  }
});

router.post("/socios", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!["administrador"].includes(user.role)) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }

  const {
    nombre,
    apellidos,
    email,
    telefono,
    direccion,
    poblacion,
    provincia,
    estado,
    grupoId,
    dni,
    genero,
    fechaNacimiento,
    fechaFallecimiento,
    tipoSocio,
    numeroSocio,
    fechaAlta,
    avatarUrl,
    membershipInvoice,
    usuarioId,
  } = req.body ?? {};

  if (!String(nombre ?? "").trim()) {
    res.status(400).json({ error: "Nombre es obligatorio" });
    return;
  }

  try {
    const normalizedBirthdate = fechaNacimiento ? String(fechaNacimiento) : null;
    const normalizedTipoSocio = normalizeTipoSocio(tipoSocio, normalizedBirthdate);
    const normalizedTipologia = normalizeTipologia(req.body?.tipologia, normalizedBirthdate);
    const normalizedEstado = normalizeEstado(estado);
    let normalizedGenero: "H" | "F" | "N" | null = null;
    try {
      normalizedGenero = normalizeGeneroForStorage(genero);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Genero inválido" });
      return;
    }
    let partnerOdooId: number | null = null;
    try {
      const odooAvatarBase64 = extractBase64ImageFromDataUrl(avatarUrl);
      const tipologiaTagId = await resolveOdooTipologiaTagId(normalizedTipologia);
      const created = await odooCall("res.partner", "create", [{
        name: `${String(nombre ?? "").trim()} ${String(apellidos ?? "").trim()}`.trim(),
        email: email || false,
        phone: telefono || false,
        street: direccion || false,
        city: poblacion || false,
        vat: dni || false,
        birthdate_date: normalizedBirthdate || false,
        ref: numeroSocio || false,
        customer_rank: normalizedEstado === "activo" ? 1 : 0,
        active: normalizedEstado !== "baja",
        ...(tipologiaTagId ? { category_id: [[4, tipologiaTagId]] } : {}),
        ...(odooAvatarBase64 ? { image_1920: odooAvatarBase64 } : {}),
      }]);
      partnerOdooId = Number(created ?? 0) || null;
    } catch {
      partnerOdooId = null;
    }

    const persistedAvatarUrl = await persistSocioAvatarIfNeeded(avatarUrl);
    let linkedUserId: number | null = Number(usuarioId ?? 0) || null;
    if (!linkedUserId && email) {
      const [linkedByEmail] = await db.select({ id: usersTable.id })
        .from(usersTable)
        .where(ilike(usersTable.email, String(email)))
        .limit(1);
      linkedUserId = linkedByEmail?.id ?? null;
    }

    const [inserted] = await db.insert(sociosTable).values({
      usuarioId: linkedUserId,
      nombre: String(nombre).trim(),
      apellidos: apellidos ? String(apellidos) : null,
      email: email ? String(email) : null,
      telefono: telefono ? String(telefono) : null,
      direccion: direccion ? String(direccion) : null,
      poblacion: poblacion ? String(poblacion) : null,
      provincia: provincia ? String(provincia) : null,
      estado: normalizedEstado,
      grupoId: grupoId != null ? Number(grupoId) : null,
      dni: dni ? String(dni) : null,
      genero: normalizedGenero,
      fechaNacimiento: normalizedBirthdate,
      fechaFallecimiento: fechaFallecimiento ? String(fechaFallecimiento) : null,
      tipologia: normalizedTipologia,
      numeroSocio: numeroSocio ? String(numeroSocio) : null,
      fechaAlta: fechaAlta ? String(fechaAlta) : null,
      avatarUrl: persistedAvatarUrl,
      odooId: partnerOdooId,
      odooSyncedAt: partnerOdooId ? new Date() : null,
    }).returning();

    if (linkedUserId) {
      await db.update(usersTable).set({
        socioId: inserted.id,
        updatedAt: new Date(),
      }).where(eq(usersTable.id, linkedUserId));
    }

    // Reconciliación no bloqueante tras alta: refresca socios desde Odoo.
    void syncSocios()
      .then((result) => {
        console.info("[POST /socios] syncSocios tras alta", result);
      })
      .catch((err) => {
        console.warn("[POST /socios] syncSocios tras alta falló:", String(err));
      });

    let membershipPago = null;
    if (membershipInvoice && normalizedTipologia !== "honorifica") {
      const inv = membershipInvoice as MembershipInvoicePayload;
      const shouldCreateInOdoo = Boolean(inv.crearEnOdoo);
      const odooMoveId = shouldCreateInOdoo && partnerOdooId
        ? await createMembershipInvoiceInOdoo({
            partnerOdooId,
            concepto: String(inv.concepto ?? "Cuota membresía"),
            importe: Number(inv.importe ?? 0),
            fechaFactura: inv.fechaFactura,
            fechaVencimiento: inv.fechaVencimiento,
            referencia: inv.referencia,
          })
        : null;
      membershipPago = await saveMembershipInvoiceLocal(inserted.id, inv, odooMoveId);
    }

    res.status(201).json({ ...inserted, membershipPago });
  } catch (err) {
    res.status(500).json({ error: "Error creando socio", detalle: String(err) });
  }
});

router.put("/socios/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!["administrador"].includes(user.role)) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }

  const id = parseInt(String(req.params.id), 10);
  const { nombre, apellidos, email, telefono, direccion, poblacion, provincia, estado, grupoId, dni, genero, fechaNacimiento, fechaFallecimiento, tipoSocio, tipologia, numeroSocio, fechaAlta, avatarUrl, membershipInvoice, usuarioId } = req.body ?? {};

  try {
    const currentRows = await db.select({
      id: sociosTable.id,
      odooId: sociosTable.odooId,
      nombre: sociosTable.nombre,
      apellidos: sociosTable.apellidos,
      email: sociosTable.email,
      telefono: sociosTable.telefono,
      direccion: sociosTable.direccion,
      poblacion: sociosTable.poblacion,
      provincia: sociosTable.provincia,
      dni: sociosTable.dni,
      fechaNacimiento: sociosTable.fechaNacimiento,
      fechaFallecimiento: sociosTable.fechaFallecimiento,
      fechaAlta: sociosTable.fechaAlta,
      numeroSocio: sociosTable.numeroSocio,
      genero: sociosTable.genero,
      estado: sociosTable.estado,
      tipologia: sociosTable.tipologia,
      grupoId: sociosTable.grupoId,
      avatarUrl: sociosTable.avatarUrl,
      usuarioId: sociosTable.usuarioId,
      odooSyncedAt: sociosTable.odooSyncedAt,
      createdAt: sociosTable.createdAt,
      updatedAt: sociosTable.updatedAt,
    }).from(sociosTable).where(eq(sociosTable.id, id)).limit(1);
    if (currentRows.length === 0) {
      res.status(404).json({ error: "Socio no encontrado" });
      return;
    }
    const current = currentRows[0];
    const normalizedBirthdate = fechaNacimiento !== undefined
      ? (fechaNacimiento ? String(fechaNacimiento) : null)
      : (current.fechaNacimiento ? String(current.fechaNacimiento) : null);
    const normalizedTipoSocio = normalizeTipoSocio(tipoSocio, normalizedBirthdate);
    const normalizedTipologia = normalizeTipologia(tipologia ?? current.tipologia, normalizedBirthdate);
    const normalizedEstado = estado !== undefined ? normalizeEstado(estado) : normalizeEstado(current.estado);
    let normalizedGenero: "H" | "F" | "N" | null | undefined = undefined;
    if (genero !== undefined) {
      try {
        normalizedGenero = normalizeGeneroForStorage(genero);
      } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : "Genero inválido" });
        return;
      }
    }

    const persistedAvatarUrl = avatarUrl !== undefined
      ? await persistSocioAvatarIfNeeded(avatarUrl)
      : undefined;

    const linkedUserId = usuarioId !== undefined
      ? (Number(usuarioId ?? 0) || null)
      : current.usuarioId ?? null;

    await db.update(sociosTable).set({
      ...(nombre && { nombre }),
      ...(apellidos !== undefined && { apellidos }),
      ...(email !== undefined && { email }),
      ...(telefono !== undefined && { telefono }),
      ...(direccion !== undefined && { direccion }),
      ...(poblacion !== undefined && { poblacion }),
      ...(provincia !== undefined && { provincia }),
      ...(estado !== undefined && { estado: normalizedEstado }),
      ...(grupoId !== undefined && { grupoId }),
      ...(dni !== undefined && { dni }),
      ...(genero !== undefined && { genero: normalizedGenero }),
      ...(fechaNacimiento !== undefined && { fechaNacimiento: normalizedBirthdate }),
      ...(fechaFallecimiento !== undefined && { fechaFallecimiento: fechaFallecimiento || null }),
      ...((tipologia !== undefined || fechaNacimiento !== undefined) ? { tipologia: normalizedTipologia } : {}),
      ...(numeroSocio !== undefined && { numeroSocio }),
      ...(fechaAlta !== undefined && { fechaAlta }),
      ...(persistedAvatarUrl !== undefined && { avatarUrl: persistedAvatarUrl }),
      ...(usuarioId !== undefined && { usuarioId: linkedUserId }),
      updatedAt: new Date(),
    }).where(eq(sociosTable.id, id));

    if (usuarioId !== undefined) {
      if (current.usuarioId) {
        await db.update(usersTable).set({
          socioId: null,
          updatedAt: new Date(),
        }).where(eq(usersTable.id, current.usuarioId));
      }
      if (linkedUserId) {
        await db.update(usersTable).set({
          socioId: id,
          updatedAt: new Date(),
        }).where(eq(usersTable.id, linkedUserId));
      }
    }

    if (current.odooId) {
      try {
        const rawAvatar = req.body?.avatarUrl;
        const avatarOdooBase64 = extractBase64ImageFromDataUrl(rawAvatar);
        const avatarCleared = rawAvatar === null || (typeof rawAvatar === "string" && rawAvatar.trim() === "");
        const tipologiaTagId = await resolveOdooTipologiaTagId(normalizedTipologia);
        await odooCall("res.partner", "write", [[current.odooId], {
          ...(nombre !== undefined || apellidos !== undefined
            ? { name: `${String(nombre ?? current.nombre ?? "").trim()} ${String(apellidos ?? current.apellidos ?? "").trim()}`.trim() }
            : {}),
          ...(email !== undefined ? { email: email || false } : {}),
          ...(telefono !== undefined ? { phone: telefono || false } : {}),
          ...(direccion !== undefined ? { street: direccion || false } : {}),
          ...(poblacion !== undefined ? { city: poblacion || false } : {}),
          ...(dni !== undefined ? { vat: dni || false } : {}),
          ...(fechaNacimiento !== undefined ? { birthdate_date: normalizedBirthdate || false } : {}),
          ...(estado !== undefined ? { active: normalizedEstado !== "baja", customer_rank: normalizedEstado === "activo" ? 1 : 0 } : {}),
          ...((tipologia !== undefined || fechaNacimiento !== undefined) && tipologiaTagId ? { category_id: [[4, tipologiaTagId]] } : {}),
          ...(numeroSocio !== undefined ? { ref: numeroSocio || false } : {}),
          ...(avatarOdooBase64 ? { image_1920: avatarOdooBase64 } : {}),
          ...(avatarCleared ? { image_1920: false } : {}),
        }]);
      } catch {
        // No bloqueamos guardado local si falla Odoo.
      }
    }

    let membershipPago = null;
    if (membershipInvoice && normalizedTipologia !== "honorifica") {
      const inv = membershipInvoice as MembershipInvoicePayload;
      const shouldCreateInOdoo = Boolean(inv.crearEnOdoo);
      const odooMoveId = shouldCreateInOdoo && current.odooId
        ? await createMembershipInvoiceInOdoo({
            partnerOdooId: current.odooId,
            concepto: String(inv.concepto ?? "Cuota membresía"),
            importe: Number(inv.importe ?? 0),
            fechaFactura: inv.fechaFactura,
            fechaVencimiento: inv.fechaVencimiento,
            referencia: inv.referencia,
          })
        : null;
      membershipPago = await saveMembershipInvoiceLocal(id, inv, odooMoveId);
    }

    const updated = await db.select({
      id: sociosTable.id,
      odooId: sociosTable.odooId,
      nombre: sociosTable.nombre,
      apellidos: sociosTable.apellidos,
      email: sociosTable.email,
      telefono: sociosTable.telefono,
      direccion: sociosTable.direccion,
      poblacion: sociosTable.poblacion,
      provincia: sociosTable.provincia,
      dni: sociosTable.dni,
      fechaNacimiento: sociosTable.fechaNacimiento,
      fechaFallecimiento: sociosTable.fechaFallecimiento,
      fechaAlta: sociosTable.fechaAlta,
      numeroSocio: sociosTable.numeroSocio,
      genero: sociosTable.genero,
      estado: sociosTable.estado,
      tipologia: sociosTable.tipologia,
      grupoId: sociosTable.grupoId,
      avatarUrl: sociosTable.avatarUrl,
      usuarioId: sociosTable.usuarioId,
      odooSyncedAt: sociosTable.odooSyncedAt,
      createdAt: sociosTable.createdAt,
      updatedAt: sociosTable.updatedAt,
    }).from(sociosTable).where(eq(sociosTable.id, id)).limit(1);
    res.json({ ...updated[0], membershipPago });
  } catch (err) {
    console.error("[PUT /socios/:id] Error actualizando socio:", err);
    res.status(500).json({ error: "Error actualizando socio", detalle: String(err) });
  }
});

export default router;
