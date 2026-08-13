import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { persistJustificantePago } from "../lib/justificantePago";
import { enqueuePagoToOdoo } from "../lib/enqueue";

const router: IRouter = Router();

const ALLOWED_ROLES = ["delegado", "directivo", "administrador", "contable"] as const;
const ADMIN_ROLES = new Set(["directivo", "administrador", "contable"]);

const VALID_TIPOS = ["fiesta", "excursion", "viaje", "evento", "actividad"] as const;
type Tipo = (typeof VALID_TIPOS)[number];
function isValidTipo(s: string): s is Tipo {
  return (VALID_TIPOS as readonly string[]).includes(s);
}

function tipoConf(tipo: Tipo): {
  table: string;
  fechaCol: string;
  precioCol: string;
  precioSuplCol: string | null;
  nombreCol: string;
  nombreEuCol: string;
  lugarCol: string | null;
  estadoCol: string;
  /** Campo que enlaza db_inscripciones con la tabla (eventoId o actividadId). */
  inscFk: "evento_id" | "actividad_id";
} {
  if (tipo === "fiesta") {
    return {
      table: "db_fiestas",
      fechaCol: "fecha",
      precioCol: "precio",
      precioSuplCol: null,
      nombreCol: "nombre",
      nombreEuCol: "nombre_eu",
      lugarCol: "lugar",
      estadoCol: "estado",
      inscFk: "evento_id",
    };
  }
  if (tipo === "excursion") {
    return {
      table: "db_excursiones",
      fechaCol: "fecha",
      precioCol: "precio_inscripcion",
      precioSuplCol: "precio_suplemento",
      nombreCol: "nombre",
      nombreEuCol: "nombre_eu",
      lugarCol: "destino",
      estadoCol: "estado",
      inscFk: "evento_id",
    };
  }
  if (tipo === "viaje") {
    return {
      table: "db_viajes",
      fechaCol: "fecha_inicio",
      precioCol: "precio_inscripcion",
      precioSuplCol: "precio_suplemento",
      nombreCol: "nombre",
      nombreEuCol: "nombre_eu",
      lugarCol: "destinos",
      estadoCol: "estado",
      inscFk: "evento_id",
    };
  }
  if (tipo === "evento") {
    return {
      table: "db_eventos",
      fechaCol: "fecha_inicio",
      precioCol: "precio",
      precioSuplCol: null,
      nombreCol: "nombre",
      nombreEuCol: "nombre_eu",
      lugarCol: "lugar",
      estadoCol: "estado",
      inscFk: "evento_id",
    };
  }
  return {
    table: "db_actividades",
    fechaCol: "created_at",
    precioCol: "precio",
    precioSuplCol: null,
    nombreCol: "nombre",
    nombreEuCol: "nombre_eu",
    lugarCol: null,
    estadoCol: "estado",
    inscFk: "actividad_id",
  };
}

async function resolveUserAndSocio(
  uid: number,
  email: string | null,
  username: string,
): Promise<{ dbUserId: number | null; socioId: number | null }> {
  const r = await pool.query(
    `SELECT id, socio_id
       FROM db_users
      WHERE odoo_uid = $1
         OR id = $1
         OR username = $2
         OR (email IS NOT NULL AND lower(trim(email)) = lower(trim($3)))
      ORDER BY
        CASE
          WHEN odoo_uid = $1 THEN 0
          WHEN id = $1 THEN 1
          WHEN username = $2 THEN 2
          ELSE 3
        END
      LIMIT 1`,
    [uid, username, email ?? ""],
  );
  if (r.rowCount === 0) return { dbUserId: null, socioId: null };
  return {
    dbUserId: Number(r.rows[0].id ?? 0) || null,
    socioId: r.rows[0].socio_id != null ? Number(r.rows[0].socio_id) : null,
  };
}

async function gruposDelDelegado(socioId: number): Promise<number[]> {
  const r = await pool.query(`SELECT id FROM db_grupos WHERE delegado_id = $1`, [socioId]);
  return r.rows.map((x: { id: number }) => Number(x.id));
}

/** Lista de eventos/actividades. Si `tipo` está vacío o es `todos`, agrega los cinco tipos
 *  en una sola lista (cada item lleva su `tipo`). El frontend clasifica por fecha. */
router.get("/delegado/eventos", requireAuth, requireRole(...ALLOWED_ROLES), async (req, res): Promise<void> => {
  const tipoRaw = String(req.query.tipo ?? "").trim().toLowerCase();
  const todos = !tipoRaw || tipoRaw === "todos";
  if (!todos && !isValidTipo(tipoRaw)) {
    res.status(400).json({ error: "tipo inválido" });
    return;
  }
  try {
    const tipos: Tipo[] = todos ? [...VALID_TIPOS] : [tipoRaw as Tipo];
    const selects = tipos.map((t) => {
      const conf = tipoConf(t);
      const lugarSel = conf.lugarCol ? conf.lugarCol : `NULL::text`;
      const precioSuplSel = conf.precioSuplCol ? conf.precioSuplCol : `NULL::numeric`;
      return `
        SELECT '${t}'::text          AS tipo,
               id,
               ${conf.nombreCol}     AS nombre,
               ${conf.nombreEuCol}   AS nombre_eu,
               ${conf.fechaCol}::timestamp AS fecha,
               ${conf.precioCol}     AS precio,
               ${precioSuplSel}      AS precio_suplemento,
               ${lugarSel}           AS lugar,
               ${conf.estadoCol}     AS estado
          FROM ${conf.table}
      `;
    });
    const sql = `${selects.join("\nUNION ALL\n")}\nORDER BY fecha DESC NULLS LAST, id DESC`;
    const r = await pool.query(sql);
    res.json({ items: r.rows });
  } catch (err) {
    console.error("[GET /delegado/eventos]", err);
    res.status(500).json({ error: "Error", detalle: String(err) });
  }
});

/** Inscritos del grupo del delegado para un evento/actividad concreto. */
router.get("/delegado/inscritos", requireAuth, requireRole(...ALLOWED_ROLES), async (req, res): Promise<void> => {
  const tipo = String(req.query.tipo ?? "").trim();
  const id = Number(req.query.id);
  if (!isValidTipo(tipo) || !Number.isFinite(id)) {
    res.status(400).json({ error: "tipo/id inválido" });
    return;
  }
  try {
    const user = req.user!;
    const userRoles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role];
    const isAdminish = userRoles.some((r) => ADMIN_ROLES.has(r));

    let grupoIds: number[] = [];
    if (!isAdminish) {
      const { socioId } = await resolveUserAndSocio(user.uid, user.email ?? null, user.username);
      if (!socioId) {
        res.json({ items: [], evento: null, motivo: "usuario_sin_socio", totales: emptyTotales() });
        return;
      }
      grupoIds = await gruposDelDelegado(socioId);
      if (grupoIds.length === 0) {
        res.json({ items: [], evento: null, motivo: "no_es_delegado", totales: emptyTotales() });
        return;
      }
    }

    const conf = tipoConf(tipo);
    const evR = await pool.query(
      `SELECT id,
              ${conf.nombreCol}   AS nombre,
              ${conf.nombreEuCol} AS nombre_eu,
              ${conf.fechaCol}    AS fecha,
              ${conf.precioCol}   AS precio,
              ${conf.precioSuplCol ?? "NULL::numeric"} AS precio_suplemento,
              ${conf.estadoCol}   AS estado
         FROM ${conf.table}
        WHERE id = $1
        LIMIT 1`,
      [id],
    );
    if (evR.rowCount === 0) {
      res.status(404).json({ error: "Evento no encontrado" });
      return;
    }
    const evento = evR.rows[0];

    // Filtro por grupo: si no es admin, restringe a socios cuyo grupo_id ∈ grupoIds.
    const params: Array<string | number | number[]> = [tipo, id];
    const grupoFilter = isAdminish
      ? ""
      : (params.push(grupoIds), `AND s.grupo_id = ANY($${params.length}::int[])`);

    const r = await pool.query(
      `
      SELECT
        i.id                          AS inscripcion_id,
        i.subactividad,
        i.parada_bus,
        i.observaciones,
        i.estado                       AS inscripcion_estado,
        s.id                          AS socio_id,
        s.nombre                       AS socio_nombre,
        s.apellidos                    AS socio_apellidos,
        s.dni                          AS socio_dni,
        s.genero                       AS socio_genero,
        s.poblacion                    AS socio_poblacion,
        s.grupo_id                     AS socio_grupo_id,
        p.id                           AS pago_id,
        p.estado                       AS pago_estado,
        p.metodo                       AS pago_metodo,
        p.importe                      AS pago_importe
      FROM db_inscripciones i
      JOIN db_socios s ON s.id = i.socio_id
      LEFT JOIN db_pagos p ON p.inscripcion_id = i.id
      WHERE i.tipo = $1
        AND i.${conf.inscFk} = $2
        ${grupoFilter}
      ORDER BY lower(coalesce(s.apellidos,'')) ASC, lower(coalesce(s.nombre,'')) ASC
      `,
      params,
    );

    const precioBase = Number(evento.precio ?? 0) || 0;
    const precioSupl = Number(evento.precio_suplemento ?? 0) || 0;

    const items = r.rows.map((row) => {
      const tieneSubact = !!String(row.subactividad ?? "").trim();
      const importe = precioBase + (tieneSubact ? precioSupl : 0);
      const pagoMetodo = String(row.pago_metodo ?? "").trim().toLowerCase();
      const pagoEstado = String(row.pago_estado ?? "pendiente").trim().toLowerCase();
      // Banco = cualquier forma de pago confirmada que no sea efectivo en mano.
      let pagoTipo: "efectivo" | "banco" | "pendiente";
      if (pagoEstado === "pagado" && (pagoMetodo === "efectivo" || pagoMetodo === "")) pagoTipo = "efectivo";
      else if (pagoEstado === "pagado") pagoTipo = "banco";
      else pagoTipo = "pendiente";
      return {
        inscripcionId: Number(row.inscripcion_id),
        socioId: Number(row.socio_id),
        socioNombre: row.socio_nombre,
        socioApellidos: row.socio_apellidos,
        socioGenero: row.socio_genero,
        socioDni: row.socio_dni,
        socioPoblacion: row.socio_poblacion,
        socioGrupoId: row.socio_grupo_id != null ? Number(row.socio_grupo_id) : null,
        subactividad: tieneSubact,
        subactividadDetalle: tieneSubact ? String(row.subactividad) : null,
        paradaBus: row.parada_bus ?? null,
        observaciones: row.observaciones ?? null,
        importe,
        pago: {
          id: row.pago_id != null ? Number(row.pago_id) : null,
          tipo: pagoTipo,
          estado: row.pago_estado ?? null,
          metodo: row.pago_metodo ?? null,
          importe: row.pago_importe != null ? Number(row.pago_importe) : null,
        },
      };
    });

    const totales = items.reduce(
      (acc, it) => {
        acc.inscritos += 1;
        if (it.subactividad) acc.subactividad += 1;
        // Códigos unificados: M = Masculino, F = Femenino, N = Otros/no informado.
        // Se acepta también 'H' (legado) como Masculino por compatibilidad.
        const g = String(it.socioGenero ?? "").trim().toUpperCase();
        if (g === "F") acc.femenino += 1;
        else if (g === "M" || g === "H") acc.masculino += 1;
        else acc.otros += 1;
        if (it.pago.tipo === "efectivo") acc.importeEfectivo += it.importe;
        else if (it.pago.tipo === "banco") acc.importeBanco += it.importe;
        else acc.importePendiente += it.importe;
        return acc;
      },
      emptyTotales(),
    );

    res.json({
      items,
      evento: {
        id: Number(evento.id),
        nombre: evento.nombre,
        nombreEu: evento.nombre_eu,
        fecha: evento.fecha,
        precio: precioBase,
        precioSuplemento: precioSupl,
        estado: evento.estado,
      },
      totales,
    });
  } catch (err) {
    console.error("[GET /delegado/inscritos]", err);
    res.status(500).json({ error: "Error", detalle: String(err) });
  }
});

function emptyTotales() {
  return {
    inscritos: 0,
    subactividad: 0,
    femenino: 0,
    masculino: 0,
    otros: 0,
    importeEfectivo: 0,
    importeBanco: 0,
    importePendiente: 0,
  };
}

/** Actualizar inscripción: subactividad (sí/no), paradaBus, observaciones y estado de pago. */
router.patch(
  "/delegado/inscripciones/:id",
  requireAuth,
  requireRole(...ALLOWED_ROLES),
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "id inválido" });
      return;
    }
    try {
      const user = req.user!;
      const userRoles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role];
      const isAdminish = userRoles.some((r) => ADMIN_ROLES.has(r));

      // Cargar inscripción + socio para validar acceso por grupo
      const insc = await pool.query(
        `SELECT i.id, i.socio_id, i.tipo, i.evento_id, i.actividad_id, i.subactividad,
                i.parada_bus, i.observaciones,
                s.grupo_id, s.id AS socio_id_check
           FROM db_inscripciones i
           JOIN db_socios s ON s.id = i.socio_id
          WHERE i.id = $1
          LIMIT 1`,
        [id],
      );
      if (insc.rowCount === 0) {
        res.status(404).json({ error: "Inscripción no encontrada" });
        return;
      }
      const row = insc.rows[0];

      if (!isAdminish) {
        const { socioId } = await resolveUserAndSocio(user.uid, user.email ?? null, user.username);
        if (!socioId) {
          res.status(403).json({ error: "Usuario no vinculado a un socio" });
          return;
        }
        const grupoIds = await gruposDelDelegado(socioId);
        if (grupoIds.length === 0 || !grupoIds.includes(Number(row.grupo_id ?? -1))) {
          res.status(403).json({ error: "El inscrito no pertenece a tu grupo" });
          return;
        }
      }

      // Resolver tipo y precios para recalcular el importe del pago.
      const tipo = String(row.tipo);
      if (!isValidTipo(tipo)) {
        res.status(400).json({ error: "tipo de inscripción no soportado" });
        return;
      }
      const conf = tipoConf(tipo);
      const eventId = Number(row.evento_id ?? row.actividad_id ?? 0);
      const evR = await pool.query(
        `SELECT ${conf.precioCol} AS precio,
                ${conf.precioSuplCol ?? "NULL::numeric"} AS precio_suplemento
           FROM ${conf.table}
          WHERE id = $1
          LIMIT 1`,
        [eventId],
      );
      const precioBase = Number(evR.rows[0]?.precio ?? 0) || 0;
      const precioSupl = Number(evR.rows[0]?.precio_suplemento ?? 0) || 0;

      // ── Actualizar inscripción ─────────────────────────────────────────
      const body = req.body ?? {};
      const sets: string[] = [];
      const params: Array<string | number | null> = [];

      let nuevaSubact: boolean | null = null;
      if (typeof body.subactividad === "boolean") {
        nuevaSubact = body.subactividad;
        const valor = body.subactividad
          ? (typeof body.subactividadDetalle === "string" && body.subactividadDetalle.trim()
              ? body.subactividadDetalle.trim()
              : "sí")
          : null;
        params.push(valor);
        sets.push(`subactividad = $${params.length}`);
      }
      if (typeof body.paradaBus === "string" || body.paradaBus === null) {
        params.push(body.paradaBus ? String(body.paradaBus).trim() : null);
        sets.push(`parada_bus = $${params.length}`);
      }
      if (typeof body.observaciones === "string" || body.observaciones === null) {
        params.push(body.observaciones ? String(body.observaciones) : null);
        sets.push(`observaciones = $${params.length}`);
      }

      if (sets.length > 0) {
        params.push(id);
        await pool.query(
          `UPDATE db_inscripciones
              SET ${sets.join(", ")},
                  updated_at = now()
            WHERE id = $${params.length}`,
          params,
        );
      }

      // Subactividad efectiva tras el update.
      const subactEfectiva = nuevaSubact !== null
        ? nuevaSubact
        : !!String(row.subactividad ?? "").trim();
      const importeCalculado = precioBase + (subactEfectiva ? precioSupl : 0);

      // ── Actualizar/crear pago ─────────────────────────────────────────
      const pagoTipo: string | undefined = body.pago?.tipo;
      const pagoMetodoCustom: string | null =
        typeof body.pago?.metodo === "string" && body.pago.metodo.trim()
          ? body.pago.metodo.trim().toLowerCase()
          : null;
      const pagoForzado = ["efectivo", "banco", "pendiente"].includes(String(pagoTipo));
      const recalcular = pagoForzado || nuevaSubact !== null;

      let pagoFinal: { id: number; estado: string; metodo: string | null; importe: number } | null = null;
      if (recalcular) {
        const pagosExistentes = await pool.query(
          `SELECT id FROM db_pagos WHERE inscripcion_id = $1 ORDER BY id DESC`,
          [id],
        );
        const pagoId = pagosExistentes.rows[0]?.id ?? null;

        let nuevoEstado = "pendiente";
        let nuevoMetodo: string | null = null;
        let nuevaFechaPago: Date | null = null;
        if (pagoTipo === "efectivo") {
          nuevoEstado = "pagado";
          nuevoMetodo = pagoMetodoCustom && pagoMetodoCustom !== "transferencia" ? pagoMetodoCustom : "efectivo";
          nuevaFechaPago = new Date();
        } else if (pagoTipo === "banco") {
          nuevoEstado = "pagado";
          // Banco = cualquier forma de pago distinta a efectivo. Por defecto "transferencia".
          nuevoMetodo = pagoMetodoCustom && pagoMetodoCustom !== "efectivo" ? pagoMetodoCustom : "transferencia";
          nuevaFechaPago = new Date();
        } else if (pagoTipo === "pendiente") {
          nuevoEstado = "pendiente";
          nuevoMetodo = null;
          nuevaFechaPago = null;
        } else if (pagoId) {
          // No se cambió el tipo, solo recalcular importe si la subact cambió.
          const cur = await pool.query(`SELECT estado, metodo FROM db_pagos WHERE id = $1`, [pagoId]);
          nuevoEstado = String(cur.rows[0]?.estado ?? "pendiente");
          nuevoMetodo = cur.rows[0]?.metodo ?? null;
          nuevaFechaPago = nuevoEstado === "pagado" ? new Date() : null;
        }

        if (pagoId) {
          const upd = await pool.query(
            `UPDATE db_pagos
                SET estado = $1,
                    metodo = $2,
                    importe = $3,
                    fecha_pago = $4,
                    updated_at = now()
              WHERE id = $5
            RETURNING id, estado, metodo, importe`,
            [nuevoEstado, nuevoMetodo, importeCalculado, nuevaFechaPago, pagoId],
          );
          const r0 = upd.rows[0];
          pagoFinal = {
            id: Number(r0.id),
            estado: String(r0.estado),
            metodo: r0.metodo,
            importe: Number(r0.importe),
          };
        } else if (importeCalculado > 0 || pagoForzado) {
          const ins = await pool.query(
            `INSERT INTO db_pagos (socio_id, inscripcion_id, concepto, importe, metodo, estado, fecha_pago)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, estado, metodo, importe`,
            [
              row.socio_id,
              id,
              `Inscripción ${tipo}`,
              importeCalculado,
              nuevoMetodo,
              nuevoEstado,
              nuevaFechaPago,
            ],
          );
          const r0 = ins.rows[0];
          pagoFinal = {
            id: Number(r0.id),
            estado: String(r0.estado),
            metodo: r0.metodo,
            importe: Number(r0.importe),
          };
        }
      }

      // Registro en Odoo: si el pago quedó 'pagado', encolar la facturación/cobro.
      if (pagoFinal && String(pagoFinal.estado).toLowerCase() === "pagado") {
        await enqueuePagoToOdoo(pagoFinal.id);
      }

      res.json({
        ok: true,
        inscripcionId: id,
        subactividad: subactEfectiva,
        importe: importeCalculado,
        pago: pagoFinal,
      });
    } catch (err) {
      console.error("[PATCH /delegado/inscripciones/:id]", err);
      res.status(500).json({ error: "Error", detalle: String(err) });
    }
  },
);

/** Liquidación del total en mano: marca todos los pagos en `efectivo` del evento como
 *  liquidados con el método indicado (transferencia, bizum, tpv, otro…), fecha y referencia.
 *  Solo aplica a inscripciones del grupo del delegado (o todas si el rol es admin). */
router.post(
  "/delegado/liquidacion",
  requireAuth,
  requireRole(...ALLOWED_ROLES),
  async (req, res): Promise<void> => {
    const tipo = String(req.query.tipo ?? req.body?.tipo ?? "").trim();
    const id = Number(req.query.id ?? req.body?.id);
    if (!isValidTipo(tipo) || !Number.isFinite(id)) {
      res.status(400).json({ error: "tipo/id inválido" });
      return;
    }
    const metodo = String(req.body?.metodo ?? "").trim().toLowerCase();
    const fecha = String(req.body?.fecha ?? "").trim();
    const referencia = String(req.body?.referencia ?? "").trim();
    if (!metodo) {
      res.status(400).json({ error: "Indica el método de liquidación." });
      return;
    }

    try {
      const user = req.user!;
      const userRoles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role];
      const isAdminish = userRoles.some((r) => ADMIN_ROLES.has(r));

      let grupoIds: number[] = [];
      if (!isAdminish) {
        const { socioId } = await resolveUserAndSocio(user.uid, user.email ?? null, user.username);
        if (!socioId) {
          res.status(403).json({ error: "Usuario no vinculado a un socio" });
          return;
        }
        grupoIds = await gruposDelDelegado(socioId);
        if (grupoIds.length === 0) {
          res.status(403).json({ error: "No tienes grupo asignado como delegado" });
          return;
        }
      }

      const conf = tipoConf(tipo);
      const params: Array<string | number | number[] | Date | null> = [tipo, id];
      const grupoFilter = isAdminish
        ? ""
        : (params.push(grupoIds), `AND s.grupo_id = ANY($${params.length}::int[])`);

      const fechaPago = fecha ? new Date(`${fecha}T12:00:00`) : new Date();
      params.push(metodo);
      const idxMetodo = params.length;
      params.push(fechaPago);
      const idxFecha = params.length;
      params.push(referencia || null);
      const idxRef = params.length;

      const r = await pool.query(
        `
        UPDATE db_pagos p
           SET metodo = $${idxMetodo},
               fecha_pago = $${idxFecha},
               referencia = COALESCE($${idxRef}, p.referencia),
               estado = 'pagado',
               updated_at = now()
          FROM db_inscripciones i
          JOIN db_socios s ON s.id = i.socio_id
         WHERE p.inscripcion_id = i.id
           AND i.tipo = $1
           AND i.${conf.inscFk} = $2
           AND lower(coalesce(p.metodo, 'efectivo')) = 'efectivo'
           AND p.estado = 'pagado'
           ${grupoFilter}
        RETURNING p.id, p.importe
        `,
        params,
      );

      const total = r.rows.reduce((acc, row) => acc + Number(row.importe ?? 0), 0);

      // Registro en Odoo: encolar el cobro de cada pago liquidado.
      for (const row of r.rows) {
        const pagoId = Number(row.id);
        if (Number.isFinite(pagoId) && pagoId > 0) {
          await enqueuePagoToOdoo(pagoId);
        }
      }

      res.json({
        ok: true,
        actualizados: r.rowCount ?? 0,
        importeTotal: total,
        metodo,
        fecha: fechaPago.toISOString().slice(0, 10),
        referencia: referencia || null,
      });
    } catch (err) {
      console.error("[POST /delegado/liquidacion]", err);
      res.status(500).json({ error: "Error", detalle: String(err) });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Pagos del grupo: listado de pagos realizados por socios del grupo del
// delegado (todos los pagos vinculados a inscripciones, sea cual sea el tipo
// de evento/actividad) y subida del PDF justificante.
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/delegado/pagos",
  requireAuth,
  requireRole(...ALLOWED_ROLES),
  async (req, res): Promise<void> => {
    try {
      const user = req.user!;
      const userRoles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role];
      const isAdminish = userRoles.some((r) => ADMIN_ROLES.has(r));

      let grupoIds: number[] = [];
      if (!isAdminish) {
        const { socioId } = await resolveUserAndSocio(user.uid, user.email ?? null, user.username);
        if (!socioId) {
          res.json({ items: [], motivo: "usuario_sin_socio", totales: emptyTotalesPagos() });
          return;
        }
        grupoIds = await gruposDelDelegado(socioId);
        if (grupoIds.length === 0) {
          res.json({ items: [], motivo: "no_es_delegado", totales: emptyTotalesPagos() });
          return;
        }
      }

      const params: Array<string | number | number[]> = [];
      const grupoFilter = isAdminish
        ? ""
        : (params.push(grupoIds), `AND s.grupo_id = ANY($${params.length}::int[])`);

      // Filtros opcionales.
      const estado = String(req.query.estado ?? "").trim().toLowerCase();
      let estadoFilter = "";
      if (estado === "pagado" || estado === "pendiente") {
        params.push(estado);
        estadoFilter = `AND lower(coalesce(p.estado, 'pendiente')) = $${params.length}`;
      }
      const metodo = String(req.query.metodo ?? "").trim().toLowerCase();
      let metodoFilter = "";
      if (metodo) {
        params.push(metodo);
        metodoFilter = `AND lower(coalesce(p.metodo, '')) = $${params.length}`;
      }
      const desde = String(req.query.desde ?? "").trim();
      let desdeFilter = "";
      if (/^\d{4}-\d{2}-\d{2}$/.test(desde)) {
        params.push(desde);
        desdeFilter = `AND p.fecha_pago >= $${params.length}::timestamp`;
      }
      const hasta = String(req.query.hasta ?? "").trim();
      let hastaFilter = "";
      if (/^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
        params.push(hasta);
        hastaFilter = `AND p.fecha_pago < ($${params.length}::date + interval '1 day')`;
      }

      const sql = `
        SELECT
          p.id,
          p.socio_id,
          p.inscripcion_id,
          p.concepto,
          p.importe,
          p.metodo,
          p.estado,
          p.fecha_pago,
          p.referencia,
          p.justificante_url,
          p.justificante_subido_en,
          p.notas,
          p.created_at,
          s.nombre        AS socio_nombre,
          s.apellidos     AS socio_apellidos,
          s.poblacion     AS socio_poblacion,
          s.grupo_id      AS socio_grupo_id,
          i.tipo          AS inscripcion_tipo,
          i.evento_id     AS inscripcion_evento_id,
          i.actividad_id  AS inscripcion_actividad_id
        FROM db_pagos p
        LEFT JOIN db_inscripciones i ON i.id = p.inscripcion_id
        JOIN db_socios s ON s.id = p.socio_id
        WHERE 1=1
          ${grupoFilter}
          ${estadoFilter}
          ${metodoFilter}
          ${desdeFilter}
          ${hastaFilter}
        ORDER BY p.fecha_pago DESC NULLS LAST, p.id DESC
      `;

      const r = await pool.query(sql, params);

      // Resolver nombre del evento/actividad por tipo cuando exista.
      const evMap = new Map<string, { nombre: string | null; nombreEu: string | null }>();
      const keysByTipo = new Map<Tipo, Set<number>>();
      for (const row of r.rows) {
        const tipoStr = String(row.inscripcion_tipo ?? "");
        if (!isValidTipo(tipoStr)) continue;
        const fk = Number(row.inscripcion_evento_id ?? row.inscripcion_actividad_id ?? 0);
        if (!Number.isFinite(fk) || fk <= 0) continue;
        if (!keysByTipo.has(tipoStr)) keysByTipo.set(tipoStr, new Set());
        keysByTipo.get(tipoStr)!.add(fk);
      }
      for (const [tipo, ids] of keysByTipo.entries()) {
        const conf = tipoConf(tipo);
        const idsArr = Array.from(ids);
        const ev = await pool.query(
          `SELECT id, ${conf.nombreCol} AS nombre, ${conf.nombreEuCol} AS nombre_eu
             FROM ${conf.table} WHERE id = ANY($1::int[])`,
          [idsArr],
        );
        for (const ro of ev.rows) {
          evMap.set(`${tipo}:${Number(ro.id)}`, { nombre: ro.nombre, nombreEu: ro.nombre_eu });
        }
      }

      const items = r.rows.map((row) => {
        const tipo = String(row.inscripcion_tipo ?? "");
        const fk = Number(row.inscripcion_evento_id ?? row.inscripcion_actividad_id ?? 0);
        const ev = isValidTipo(tipo) && fk ? evMap.get(`${tipo}:${fk}`) ?? null : null;
        return {
          id: Number(row.id),
          socioId: Number(row.socio_id ?? 0) || null,
          inscripcionId: row.inscripcion_id != null ? Number(row.inscripcion_id) : null,
          concepto: row.concepto,
          importe: Number(row.importe ?? 0),
          metodo: row.metodo,
          estado: row.estado,
          fechaPago: row.fecha_pago,
          referencia: row.referencia,
          justificanteUrl: row.justificante_url ?? null,
          justificanteSubidoEn: row.justificante_subido_en ?? null,
          notas: row.notas ?? null,
          createdAt: row.created_at,
          socio: {
            nombre: row.socio_nombre,
            apellidos: row.socio_apellidos,
            poblacion: row.socio_poblacion,
            grupoId: row.socio_grupo_id != null ? Number(row.socio_grupo_id) : null,
          },
          inscripcion: row.inscripcion_id
            ? {
                id: Number(row.inscripcion_id),
                tipo,
                eventoId: fk || null,
                eventoNombre: ev?.nombre ?? null,
                eventoNombreEu: ev?.nombreEu ?? null,
              }
            : null,
        };
      });

      const totales = items.reduce(
        (acc, it) => {
          acc.total += 1;
          acc.importeTotal += it.importe;
          if (String(it.estado).toLowerCase() === "pagado") {
            acc.cobrados += 1;
            acc.importeCobrado += it.importe;
          } else {
            acc.pendientes += 1;
            acc.importePendiente += it.importe;
          }
          if (it.justificanteUrl) acc.conJustificante += 1;
          else acc.sinJustificante += 1;
          return acc;
        },
        emptyTotalesPagos(),
      );

      res.json({ items, totales });
    } catch (err) {
      console.error("[GET /delegado/pagos]", err);
      res.status(500).json({ error: "Error", detalle: String(err) });
    }
  },
);

function emptyTotalesPagos() {
  return {
    total: 0,
    cobrados: 0,
    pendientes: 0,
    conJustificante: 0,
    sinJustificante: 0,
    importeTotal: 0,
    importeCobrado: 0,
    importePendiente: 0,
  };
}

/** Actualizar un pago: subir/quitar justificante PDF, notas, referencia o método. */
router.patch(
  "/delegado/pagos/:id",
  requireAuth,
  requireRole(...ALLOWED_ROLES),
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "id inválido" });
      return;
    }
    try {
      const user = req.user!;
      const userRoles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role];
      const isAdminish = userRoles.some((r) => ADMIN_ROLES.has(r));

      // Cargar pago + socio para validar acceso por grupo.
      const cur = await pool.query(
        `SELECT p.id, p.socio_id, s.grupo_id
           FROM db_pagos p
           JOIN db_socios s ON s.id = p.socio_id
          WHERE p.id = $1
          LIMIT 1`,
        [id],
      );
      if (cur.rowCount === 0) {
        res.status(404).json({ error: "Pago no encontrado" });
        return;
      }
      const row = cur.rows[0];

      if (!isAdminish) {
        const { socioId } = await resolveUserAndSocio(user.uid, user.email ?? null, user.username);
        if (!socioId) {
          res.status(403).json({ error: "Usuario no vinculado a un socio" });
          return;
        }
        const grupoIds = await gruposDelDelegado(socioId);
        if (grupoIds.length === 0 || !grupoIds.includes(Number(row.grupo_id ?? -1))) {
          res.status(403).json({ error: "El pago no pertenece a tu grupo" });
          return;
        }
      }

      const body = req.body ?? {};
      const sets: string[] = [];
      const params: Array<string | number | Date | null> = [];

      // Subida o cambio de justificante.
      if (body.justificante !== undefined) {
        if (body.justificante === null || body.justificante === "") {
          params.push(null);
          sets.push(`justificante_url = $${params.length}`);
          params.push(null);
          sets.push(`justificante_subido_en = $${params.length}`);
        } else {
          const url = await persistJustificantePago(body.justificante);
          if (!url) {
            res.status(400).json({ error: "Archivo no válido. Debe ser PDF o imagen y <= 12 MB." });
            return;
          }
          params.push(url);
          sets.push(`justificante_url = $${params.length}`);
          params.push(new Date());
          sets.push(`justificante_subido_en = $${params.length}`);
        }
      }

      if (typeof body.notas === "string" || body.notas === null) {
        params.push(body.notas ? String(body.notas) : null);
        sets.push(`notas = $${params.length}`);
      }
      if (typeof body.referencia === "string" || body.referencia === null) {
        params.push(body.referencia ? String(body.referencia).trim() : null);
        sets.push(`referencia = $${params.length}`);
      }
      if (typeof body.metodo === "string" && body.metodo.trim()) {
        params.push(String(body.metodo).trim().toLowerCase());
        sets.push(`metodo = $${params.length}`);
      }
      if (typeof body.fechaPago === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.fechaPago)) {
        params.push(new Date(`${body.fechaPago}T12:00:00`));
        sets.push(`fecha_pago = $${params.length}`);
      }

      if (sets.length === 0) {
        res.status(400).json({ error: "Nada que actualizar" });
        return;
      }

      params.push(id);
      const upd = await pool.query(
        `UPDATE db_pagos
            SET ${sets.join(", ")},
                updated_at = now()
          WHERE id = $${params.length}
        RETURNING id, justificante_url, justificante_subido_en, notas, referencia, metodo, fecha_pago, estado, importe`,
        params,
      );

      res.json({ ok: true, pago: upd.rows[0] });
    } catch (err) {
      console.error("[PATCH /delegado/pagos/:id]", err);
      res.status(500).json({ error: "Error", detalle: String(err) });
    }
  },
);

export default router;
