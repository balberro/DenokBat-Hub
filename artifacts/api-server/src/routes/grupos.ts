import { Router, type IRouter } from "express";
import { db, pool } from "@workspace/db";
import { gruposTable, sociosTable } from "@workspace/db/schema";
import { requireAuth, requireRole } from "../middlewares/auth";
import { eq, sql, asc } from "drizzle-orm";

const router: IRouter = Router();

const GRUPOS_GESTION_ROLES = ["administrador", "contable"];

async function ensureGruposSchema(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS db_grupos (
        id           SERIAL PRIMARY KEY,
        nombre       VARCHAR(255) NOT NULL,
        nombre_eu    VARCHAR(255),
        delegado_id  INTEGER,
        poblaciones  TEXT[] NOT NULL DEFAULT '{}',
        created_at   TIMESTAMPTZ DEFAULT now(),
        updated_at   TIMESTAMPTZ DEFAULT now()
      );
    `);
    await pool.query(`
      ALTER TABLE db_grupos
        ADD COLUMN IF NOT EXISTS nombre_eu   VARCHAR(255),
        ADD COLUMN IF NOT EXISTS delegado_id INTEGER,
        ADD COLUMN IF NOT EXISTS poblaciones TEXT[] NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT now(),
        ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT now();
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS db_grupos_poblaciones_gin
        ON db_grupos USING GIN (poblaciones);
    `);
    await pool.query(`
      ALTER TABLE db_socios
        ADD COLUMN IF NOT EXISTS grupo_manual BOOLEAN NOT NULL DEFAULT FALSE;
    `);
  } catch (e) {
    console.warn("[ensureGruposSchema]", e);
  }
}

function sanitizePoblaciones(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of value) {
    const s = String(v ?? "").trim();
    if (!s) continue;
    const norm = s;
    const key = norm.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(norm);
  }
  return out;
}

/** Devuelve el cargo_id del código "delegado_zona", creándolo si no existe. */
async function ensureDelegadoCargoId(): Promise<number | null> {
  try {
    const r = await pool.query(
      `SELECT id FROM db_cargos WHERE codigo = 'delegado_zona' LIMIT 1`,
    );
    if ((r.rowCount ?? 0) > 0) return Number(r.rows[0].id);
    const ins = await pool.query(
      `INSERT INTO db_cargos (codigo, nombre, nombre_eu, ambito, activo)
       VALUES ('delegado_zona', 'Delegado/a de zona', 'Zona ordezkaria', 'delegado', 1)
       ON CONFLICT (codigo) DO UPDATE SET activo = 1
       RETURNING id`,
    );
    return ins.rows[0]?.id != null ? Number(ins.rows[0].id) : null;
  } catch (e) {
    console.warn("[ensureDelegadoCargoId]", e);
    return null;
  }
}

/** Sincroniza el cargo "delegado_zona" del socio en `db_historico_cargos`:
 *  - Si cambia el delegado, cierra la línea abierta del anterior y abre una nueva para el nuevo.
 *  - Pasa `newDelegadoId = null` para cerrar todas las líneas abiertas del grupo (borrado/desasignación). */
async function syncDelegadoHistorico(
  grupoId: number,
  prevDelegadoId: number | null,
  newDelegadoId: number | null,
  grupoNombre: string,
): Promise<void> {
  if (prevDelegadoId === newDelegadoId) return;
  const cargoId = await ensureDelegadoCargoId();
  if (!cargoId) return;
  const today = new Date().toISOString().slice(0, 10);
  const marker = `[grupo:${grupoId}]`;

  try {
    if (prevDelegadoId !== null) {
      await pool.query(
        `UPDATE db_historico_cargos
            SET fecha_fin = $1,
                updated_at = now()
          WHERE socio_id = $2
            AND cargo_id = $3
            AND fecha_fin IS NULL
            AND COALESCE(descripcion, '') LIKE $4`,
        [today, prevDelegadoId, cargoId, `%${marker}%`],
      );
    }

    if (newDelegadoId !== null) {
      // Evitar duplicar líneas abiertas si ya existe una para este grupo+socio.
      const exists = await pool.query(
        `SELECT id FROM db_historico_cargos
          WHERE socio_id = $1
            AND cargo_id = $2
            AND fecha_fin IS NULL
            AND COALESCE(descripcion, '') LIKE $3
          LIMIT 1`,
        [newDelegadoId, cargoId, `%${marker}%`],
      );
      if ((exists.rowCount ?? 0) === 0) {
        await pool.query(
          `INSERT INTO db_historico_cargos (socio_id, cargo_id, fecha_inicio, descripcion, descripcion_eu)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            newDelegadoId,
            cargoId,
            today,
            `Delegado/a del grupo "${grupoNombre}" ${marker}`,
            `"${grupoNombre}" taldeko ordezkaria ${marker}`,
          ],
        );
      }
    }
  } catch (e) {
    console.warn("[syncDelegadoHistorico]", e);
  }
}

async function validateDelegadoSocio(
  delegadoId: number | null,
  poblaciones: string[],
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (delegadoId === null) return { ok: true };
  if (!Number.isFinite(delegadoId)) {
    return { ok: false, status: 400, error: "Delegado no válido." };
  }

  const r = await pool.query(
    `SELECT id, poblacion
       FROM db_socios
      WHERE id = $1
      LIMIT 1`,
    [delegadoId],
  );
  if (r.rowCount === 0) {
    return { ok: false, status: 400, error: "El delegado seleccionado no existe como socio." };
  }

  const delegadoPoblacion = String(r.rows[0]?.poblacion ?? "").trim().toLowerCase();
  const grupoPoblaciones = new Set(poblaciones.map((p) => p.trim().toLowerCase()).filter(Boolean));
  if (!delegadoPoblacion || !grupoPoblaciones.has(delegadoPoblacion)) {
    return {
      ok: false,
      status: 400,
      error: "El delegado debe ser un socio de una de las poblaciones del grupo.",
    };
  }

  return { ok: true };
}

/** Auto-asigna grupo_id a los socios cuya `poblacion` aparezca en `poblaciones` del grupo
 *  y NO estén marcados como manual (grupo_manual=TRUE). */
async function asignarSociosAGrupo(grupoId: number, poblaciones: string[]): Promise<{ asignados: number }> {
  if (poblaciones.length === 0) return { asignados: 0 };
  const r = await pool.query(
    `UPDATE db_socios
        SET grupo_id = $1,
            updated_at = now()
      WHERE poblacion IS NOT NULL
        AND trim(poblacion) <> ''
        AND poblacion = ANY ($2::text[])
        AND (grupo_manual IS NOT TRUE)
        AND (grupo_id IS DISTINCT FROM $1)`,
    [grupoId, poblaciones],
  );
  return { asignados: r.rowCount ?? 0 };
}

/** Desasigna socios automáticos del grupo cuya población ya no encaje.
 *  NO toca socios con grupo_manual=TRUE. */
async function desasignarSociosFueraDeGrupo(grupoId: number, poblaciones: string[]): Promise<{ desasignados: number }> {
  const r = poblaciones.length === 0
    ? await pool.query(
        `UPDATE db_socios
            SET grupo_id = NULL,
                updated_at = now()
          WHERE grupo_id = $1
            AND (grupo_manual IS NOT TRUE)`,
        [grupoId],
      )
    : await pool.query(
        `UPDATE db_socios
            SET grupo_id = NULL,
                updated_at = now()
          WHERE grupo_id = $1
            AND (grupo_manual IS NOT TRUE)
            AND (poblacion IS NULL
                 OR trim(poblacion) = ''
                 OR NOT (poblacion = ANY ($2::text[])))`,
        [grupoId, poblaciones],
      );
  return { desasignados: r.rowCount ?? 0 };
}

router.get(
  "/admin/grupos/poblaciones-disponibles",
  requireAuth,
  requireRole(...GRUPOS_GESTION_ROLES),
  async (_req, res): Promise<void> => {
    try {
      const r = await pool.query(`
        SELECT DISTINCT trim(poblacion) AS poblacion
          FROM db_socios
         WHERE poblacion IS NOT NULL AND trim(poblacion) <> ''
         ORDER BY 1
      `);
      res.json({ items: r.rows.map((x: { poblacion: string }) => x.poblacion) });
    } catch (err) {
      res.status(500).json({ error: "Error", detalle: String(err) });
    }
  },
);

router.get(
  "/admin/grupos",
  requireAuth,
  requireRole(...GRUPOS_GESTION_ROLES),
  async (_req, res): Promise<void> => {
    try {
      await ensureGruposSchema();
      const r = await pool.query(`
        SELECT g.id,
               g.nombre,
               g.nombre_eu,
               g.delegado_id,
               g.poblaciones,
               g.created_at,
               g.updated_at,
               COALESCE(d.nombre, '') || CASE WHEN d.apellidos IS NOT NULL AND length(trim(d.apellidos)) > 0
                                              THEN ' ' || d.apellidos ELSE '' END AS delegado_nombre,
               (SELECT COUNT(*) FROM db_socios s WHERE s.grupo_id = g.id)::int AS num_socios
          FROM db_grupos g
          LEFT JOIN db_socios d ON d.id = g.delegado_id
         ORDER BY lower(g.nombre) ASC
      `);
      res.json({ items: r.rows });
    } catch (err) {
      res.status(500).json({ error: "Error", detalle: String(err) });
    }
  },
);

/** Debe ir ANTES de `/admin/grupos/:id` para no capturar "socios-huerfanos" como id. */
router.get(
  "/admin/grupos/socios-huerfanos",
  requireAuth,
  requireRole(...GRUPOS_GESTION_ROLES),
  async (_req, res): Promise<void> => {
    try {
      await ensureGruposSchema();
      const r1 = await pool.query(`
        SELECT DISTINCT unnest(poblaciones) AS poblacion FROM db_grupos
      `);
      const cubiertas = new Set<string>((r1.rows as { poblacion: string }[]).map((x) => String(x.poblacion).toLowerCase()));

      const r2 = await pool.query(`
        SELECT id, nombre, apellidos, poblacion, email, telefono, estado, grupo_manual
          FROM db_socios
         WHERE grupo_id IS NULL
         ORDER BY lower(coalesce(poblacion,'')) ASC,
                  lower(coalesce(apellidos,'')) ASC,
                  lower(coalesce(nombre,'')) ASC
      `);

      const sinGrupo = r2.rows as Array<{
        id: number;
        nombre: string | null;
        apellidos: string | null;
        poblacion: string | null;
        email: string | null;
        telefono: string | null;
        estado: string | null;
        grupo_manual: boolean;
      }>;

      const sinGrupoEnriquecidos = sinGrupo.map((s) => {
        const pob = (s.poblacion ?? "").trim();
        const huerfana = pob.length > 0 && !cubiertas.has(pob.toLowerCase());
        return { ...s, poblacion_huerfana: huerfana };
      });

      const huerfanasMap = new Map<string, number>();
      for (const s of sinGrupoEnriquecidos) {
        if (s.poblacion_huerfana && s.poblacion) {
          huerfanasMap.set(s.poblacion, (huerfanasMap.get(s.poblacion) ?? 0) + 1);
        }
      }
      const poblacionesHuerfanas = Array.from(huerfanasMap.entries())
        .map(([poblacion, num_socios]) => ({ poblacion, num_socios }))
        .sort((a, b) => a.poblacion.localeCompare(b.poblacion, "es"));

      res.json({
        socios_sin_grupo: sinGrupoEnriquecidos,
        poblaciones_huerfanas: poblacionesHuerfanas,
        poblaciones_cubiertas: Array.from(cubiertas),
      });
    } catch (err) {
      console.error("[GET /admin/grupos/socios-huerfanos]", err);
      res.status(500).json({ error: "Error", detalle: String(err) });
    }
  },
);

router.get(
  "/admin/grupos/:id",
  requireAuth,
  requireRole(...GRUPOS_GESTION_ROLES),
  async (req, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Id no válido" });
      return;
    }
    try {
      await ensureGruposSchema();
      const r = await pool.query(
        `SELECT g.id,
                g.nombre,
                g.nombre_eu,
                g.delegado_id,
                g.poblaciones,
                g.created_at,
                g.updated_at,
                COALESCE(d.nombre, '') || CASE WHEN d.apellidos IS NOT NULL AND length(trim(d.apellidos)) > 0
                                               THEN ' ' || d.apellidos ELSE '' END AS delegado_nombre
           FROM db_grupos g
           LEFT JOIN db_socios d ON d.id = g.delegado_id
          WHERE g.id = $1`,
        [id],
      );
      if (r.rowCount === 0) {
        res.status(404).json({ error: "Grupo no encontrado" });
        return;
      }
      const row = r.rows[0] as Record<string, unknown>;
      const socios = await db
        .select({
          id: sociosTable.id,
          nombre: sociosTable.nombre,
          apellidos: sociosTable.apellidos,
          poblacion: sociosTable.poblacion,
          email: sociosTable.email,
          telefono: sociosTable.telefono,
          estado: sociosTable.estado,
          grupoManual: sociosTable.grupoManual,
        })
        .from(sociosTable)
        .where(eq(sociosTable.grupoId, id))
        .orderBy(asc(sql`lower(coalesce(${sociosTable.poblacion}, ''))`), asc(sql`lower(coalesce(${sociosTable.apellidos}, ''))`), asc(sql`lower(coalesce(${sociosTable.nombre}, ''))`));

      const grupo = {
        id: Number(row.id),
        nombre: String(row.nombre ?? ""),
        nombre_eu: row.nombre_eu != null ? String(row.nombre_eu) : null,
        delegado_id: row.delegado_id != null ? Number(row.delegado_id) : null,
        delegado_nombre: row.delegado_nombre != null ? String(row.delegado_nombre) : null,
        poblaciones: Array.isArray(row.poblaciones) ? (row.poblaciones as string[]) : [],
        created_at: row.created_at,
        updated_at: row.updated_at,
        num_socios: socios.length,
      };

      const porPoblacion: Record<string, typeof socios> = {};
      for (const s of socios) {
        const key = String(s.poblacion ?? "").trim() || "—";
        (porPoblacion[key] ||= []).push(s);
      }
      res.json({ grupo, socios, socios_por_poblacion: porPoblacion });
    } catch (err) {
      res.status(500).json({ error: "Error", detalle: String(err) });
    }
  },
);

router.post(
  "/admin/grupos",
  requireAuth,
  requireRole(...GRUPOS_GESTION_ROLES),
  async (req, res): Promise<void> => {
    const body = req.body ?? {};
    const nombre = String(body.nombre ?? "").trim();
    const nombreEu = String(body.nombre_eu ?? body.nombreEu ?? "").trim() || null;
    const delegadoId = body.delegado_id != null ? parseInt(String(body.delegado_id), 10) : null;
    const poblaciones = sanitizePoblaciones(body.poblaciones);

    if (!nombre) {
      res.status(400).json({ error: "El nombre del grupo es obligatorio." });
      return;
    }
    if (poblaciones.length === 0) {
      res.status(400).json({ error: "Indica al menos una población que abarque el grupo." });
      return;
    }

    try {
      await ensureGruposSchema();
      const delegadoCheck = await validateDelegadoSocio(
        Number.isFinite(delegadoId) ? delegadoId : null,
        poblaciones,
      );
      if (!delegadoCheck.ok) {
        res.status(delegadoCheck.status).json({ error: delegadoCheck.error });
        return;
      }
      const [inserted] = await db
        .insert(gruposTable)
        .values({
          nombre,
          nombreEu,
          delegadoId: Number.isFinite(delegadoId) ? delegadoId : null,
          poblaciones,
        })
        .returning();
      const asignacion = await asignarSociosAGrupo(inserted.id, poblaciones);
      await syncDelegadoHistorico(
        inserted.id,
        null,
        Number.isFinite(delegadoId) ? delegadoId : null,
        nombre,
      );
      res.status(201).json({ ok: true, grupo: inserted, ...asignacion });
    } catch (err) {
      console.error("[POST /admin/grupos]", err);
      if (String(err).includes("db_grupos_delegado_id_fkey") || String(err).includes("db_users")) {
        res.status(503).json({
          error: "Hay que actualizar la FK de delegado del grupo.",
          detalle: "Ejecuta como propietario de la BD: psql \"$DATABASE_URL\" -f lib/db/fix-db-grupos.sql",
        });
        return;
      }
      res.status(500).json({ error: "Error creando grupo", detalle: String(err) });
    }
  },
);

router.put(
  "/admin/grupos/:id",
  requireAuth,
  requireRole(...GRUPOS_GESTION_ROLES),
  async (req, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Id no válido" });
      return;
    }
    const body = req.body ?? {};
    const nombre = String(body.nombre ?? "").trim();
    const nombreEu = String(body.nombre_eu ?? body.nombreEu ?? "").trim() || null;
    const delegadoIdRaw = body.delegado_id;
    const delegadoId =
      delegadoIdRaw === null || delegadoIdRaw === "" || delegadoIdRaw === undefined
        ? null
        : parseInt(String(delegadoIdRaw), 10);
    const poblaciones = sanitizePoblaciones(body.poblaciones);

    if (!nombre) {
      res.status(400).json({ error: "El nombre del grupo es obligatorio." });
      return;
    }
    if (poblaciones.length === 0) {
      res.status(400).json({ error: "Indica al menos una población que abarque el grupo." });
      return;
    }

    try {
      await ensureGruposSchema();
      const [prev] = await db.select().from(gruposTable).where(eq(gruposTable.id, id)).limit(1);
      if (!prev) {
        res.status(404).json({ error: "Grupo no encontrado" });
        return;
      }
      const delegadoCheck = await validateDelegadoSocio(
        Number.isFinite(delegadoId as number) ? (delegadoId as number) : null,
        poblaciones,
      );
      if (!delegadoCheck.ok) {
        res.status(delegadoCheck.status).json({ error: delegadoCheck.error });
        return;
      }
      await db
        .update(gruposTable)
        .set({
          nombre,
          nombreEu,
          delegadoId: Number.isFinite(delegadoId as number) ? (delegadoId as number) : null,
          poblaciones,
          updatedAt: new Date(),
        })
        .where(eq(gruposTable.id, id));

      const desasignacion = await desasignarSociosFueraDeGrupo(id, poblaciones);
      const asignacion = await asignarSociosAGrupo(id, poblaciones);
      await syncDelegadoHistorico(
        id,
        prev.delegadoId ?? null,
        Number.isFinite(delegadoId as number) ? (delegadoId as number) : null,
        nombre,
      );
      const [updated] = await db.select().from(gruposTable).where(eq(gruposTable.id, id)).limit(1);
      res.json({ ok: true, grupo: updated, ...asignacion, ...desasignacion });
    } catch (err) {
      console.error("[PUT /admin/grupos/:id]", err);
      if (String(err).includes("db_grupos_delegado_id_fkey") || String(err).includes("db_users")) {
        res.status(503).json({
          error: "Hay que actualizar la FK de delegado del grupo.",
          detalle: "Ejecuta como propietario de la BD: psql \"$DATABASE_URL\" -f lib/db/fix-db-grupos.sql",
        });
        return;
      }
      res.status(500).json({ error: "Error actualizando grupo", detalle: String(err) });
    }
  },
);

router.delete(
  "/admin/grupos/:id",
  requireAuth,
  requireRole(...GRUPOS_GESTION_ROLES),
  async (req, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Id no válido" });
      return;
    }
    try {
      await ensureGruposSchema();
      const [prev] = await db.select().from(gruposTable).where(eq(gruposTable.id, id)).limit(1);
      // Desasignar socios antes de borrar para mantener integridad.
      // También limpia grupo_manual: si el grupo desaparece, no tiene sentido conservar la marca.
      await pool.query(
        `UPDATE db_socios
            SET grupo_id = NULL,
                grupo_manual = FALSE,
                updated_at = now()
          WHERE grupo_id = $1`,
        [id],
      );
      if (prev) {
        await syncDelegadoHistorico(id, prev.delegadoId ?? null, null, prev.nombre ?? "");
      }
      await db.delete(gruposTable).where(eq(gruposTable.id, id));
      res.json({ ok: true });
    } catch (err) {
      console.error("[DELETE /admin/grupos/:id]", err);
      res.status(500).json({ error: "Error borrando grupo", detalle: String(err) });
    }
  },
);

/** Asignación manual del rol contable: fija grupo_id y marca grupo_manual=TRUE. */
router.put(
  "/admin/socios/:id/grupo",
  requireAuth,
  requireRole(...GRUPOS_GESTION_ROLES),
  async (req, res): Promise<void> => {
    const socioId = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(socioId)) {
      res.status(400).json({ error: "Id no válido" });
      return;
    }
    const raw = req.body?.grupo_id;
    const grupoId = raw === null || raw === "" || raw === undefined ? null : parseInt(String(raw), 10);
    if (grupoId !== null && !Number.isFinite(grupoId)) {
      res.status(400).json({ error: "grupo_id no válido" });
      return;
    }
    try {
      await ensureGruposSchema();
      if (grupoId !== null) {
        const r = await pool.query(`SELECT id FROM db_grupos WHERE id = $1`, [grupoId]);
        if (r.rowCount === 0) {
          res.status(404).json({ error: "Grupo no encontrado" });
          return;
        }
      }
      const r = await pool.query(
        `UPDATE db_socios
            SET grupo_id = $1,
                grupo_manual = TRUE,
                updated_at = now()
          WHERE id = $2
        RETURNING id, grupo_id, grupo_manual`,
        [grupoId, socioId],
      );
      if (r.rowCount === 0) {
        res.status(404).json({ error: "Socio no encontrado" });
        return;
      }
      res.json({ ok: true, socio: r.rows[0] });
    } catch (err) {
      console.error("[PUT /admin/socios/:id/grupo]", err);
      res.status(500).json({ error: "Error", detalle: String(err) });
    }
  },
);

/** Vuelve la asignación a automática: grupo_manual=FALSE y recalcula grupo_id según poblaciones. */
router.post(
  "/admin/socios/:id/grupo-automatico",
  requireAuth,
  requireRole(...GRUPOS_GESTION_ROLES),
  async (req, res): Promise<void> => {
    const socioId = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(socioId)) {
      res.status(400).json({ error: "Id no válido" });
      return;
    }
    try {
      await ensureGruposSchema();
      const r = await pool.query(
        `UPDATE db_socios s
            SET grupo_manual = FALSE,
                grupo_id = (
                  SELECT g.id FROM db_grupos g
                   WHERE s.poblacion IS NOT NULL
                     AND trim(s.poblacion) <> ''
                     AND s.poblacion = ANY (g.poblaciones)
                   ORDER BY g.id DESC
                   LIMIT 1
                ),
                updated_at = now()
          WHERE s.id = $1
        RETURNING id, grupo_id, grupo_manual`,
        [socioId],
      );
      if (r.rowCount === 0) {
        res.status(404).json({ error: "Socio no encontrado" });
        return;
      }
      res.json({ ok: true, socio: r.rows[0] });
    } catch (err) {
      console.error("[POST /admin/socios/:id/grupo-automatico]", err);
      res.status(500).json({ error: "Error", detalle: String(err) });
    }
  },
);

/** Listado de socios del grupo (o grupos) del que el usuario logueado es delegado. */
router.get("/socios/mi-grupo", requireAuth, async (req, res): Promise<void> => {
  try {
    const user = req.user!;
    const allowed = ["delegado", "directivo", "administrador", "contable"];
    const userRoles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role];
    if (!userRoles.some((r) => allowed.includes(r))) {
      res.status(403).json({ error: "Acceso no autorizado" });
      return;
    }

    const r1 = await pool.query(
      `SELECT id, socio_id, email
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
      [user.uid, user.username, user.email ?? ""],
    );
    if (r1.rowCount === 0) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }
    const dbUserId = Number(r1.rows[0]?.id ?? 0) || null;
    let socioId = r1.rows[0]?.socio_id != null ? Number(r1.rows[0].socio_id) : null;
    const userEmail = String(r1.rows[0]?.email ?? "").trim();

    // Fallback: si no hay vínculo en db_users.socio_id, intentar por email.
    // Solo si el email coincide con UN único socio que ADEMÁS es delegado de algún grupo,
    // lo auto-vinculamos para que el usuario pueda operar sin intervención manual.
    if (!socioId && userEmail) {
      const rFb = await pool.query(
        `SELECT s.id
           FROM db_socios s
          WHERE lower(trim(coalesce(s.email,''))) = lower(trim($1))
            AND EXISTS (
              SELECT 1 FROM db_grupos g WHERE g.delegado_id = s.id
            )`,
        [userEmail],
      );
      if (rFb.rowCount === 1) {
        const candidateSocioId = Number(rFb.rows[0].id);
        try {
          await pool.query(
            `UPDATE db_users SET socio_id = $1, updated_at = now() WHERE id = $2`,
            [candidateSocioId, dbUserId],
          );
          await pool.query(
            `UPDATE db_socios SET usuario_id = $1, updated_at = now() WHERE id = $2`,
            [dbUserId, candidateSocioId],
          );
          socioId = candidateSocioId;
        } catch (e) {
          console.warn("[mi-grupo] auto-vinculación fallida:", String(e));
        }
      }
    }

    if (!socioId) {
      res.json({ grupos: [], socios: [], razon: "usuario_sin_socio" });
      return;
    }

    const r2 = await pool.query(
      `SELECT id, nombre, nombre_eu, poblaciones
         FROM db_grupos
        WHERE delegado_id = $1
        ORDER BY lower(nombre) ASC`,
      [socioId],
    );
    const grupos = r2.rows as Array<{
      id: number;
      nombre: string;
      nombre_eu: string | null;
      poblaciones: string[];
    }>;
    if (grupos.length === 0) {
      res.json({ grupos: [], socios: [], razon: "no_es_delegado" });
      return;
    }
    const grupoIds = grupos.map((g) => Number(g.id));
    const r3 = await pool.query(
      `SELECT id, nombre, apellidos, poblacion, email, telefono, dni, genero, estado, grupo_id
         FROM db_socios
        WHERE grupo_id = ANY($1::int[])
        ORDER BY lower(coalesce(poblacion,'')) ASC,
                 lower(coalesce(apellidos,'')) ASC,
                 lower(coalesce(nombre,'')) ASC`,
      [grupoIds],
    );
    res.json({ grupos, socios: r3.rows });
  } catch (err) {
    console.error("[GET /socios/mi-grupo]", err);
    res.status(500).json({ error: "Error", detalle: String(err) });
  }
});

export default router;
