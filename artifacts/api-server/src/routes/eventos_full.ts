import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  eventosFullTable,
  eventosSubactsTable,
  eventosMediaTable,
} from "@workspace/db/schema";
import { eq, desc, and, asc, inArray } from "drizzle-orm";
import { requireAuth, requireRole, optionalAuth } from "../middlewares/auth";

const router: IRouter = Router();

// ─── Acceso por rol ─────────────────────────────────────────────────────────
// - Visitante (sin sesión): solo eventos "próximos", sin datos de inscripción.
// - Usuario (sesión sin rol directivo): próximos + inscripción abierta, sin
//   datos de inscripción.
// - Socio: todos los eventos y todas las opciones.
// - Directivo/administrador/contable: además, gestión (CRUD).

const ROLES_DIRECTIVA = ["directivo", "administrador", "contable"];

function userRoles(req: Express.Request): string[] {
  const user = req.user;
  if (!user) return [];
  if (Array.isArray(user.roles) && user.roles.length > 0) return user.roles;
  return [user.role].filter(Boolean);
}

function isSocio(user: Express.Request["user"]): boolean {
  if (!user) return false;
  const roles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role].filter(Boolean);
  return roles.some((r) => r === "socio" || ROLES_DIRECTIVA.includes(r));
}

/** Filtro de estado visible según el rol. null = sin restricción. */
function visibleStatesFor(req: Express.Request): string[] | null {
  const roles = userRoles(req);
  const esDirectiva = roles.some((r) => ROLES_DIRECTIVA.includes(r));
  const esSocio = roles.includes("socio") || esDirectiva;
  if (esDirectiva) return null; // directiva ve todos (gestión)
  if (esSocio) return null;     // socio ve todos
  if (roles.length > 0) return ["proxima", "proximo", "prevista", "previsto"]; // usuario
  return ["proxima", "proximo"]; // visitante
}

/**
 * Elimina los campos sensibles de inscripción cuando el usuario no es socio.
 * El socio/directiva recibe el evento completo.
 */
function sanitizeForRole<T extends Record<string, unknown>>(row: T, req: Express.Request): Record<string, unknown> {
  const roles = userRoles(req);
  const esDirectiva = roles.some((r) => ROLES_DIRECTIVA.includes(r));
  const esSocio = roles.includes("socio") || esDirectiva;
  if (esSocio) return { ...row };
  const { precioInscripcion, precioSuplemento, fechaFinInscripcion, plazasDisponibles, ...rest } = row as Record<string, unknown>;
  return rest;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchSubacts(eventoId: number) {
  return db
    .select()
    .from(eventosSubactsTable)
    .where(eq(eventosSubactsTable.eventoId, eventoId))
    .orderBy(asc(eventosSubactsTable.orden));
}

async function fetchMedia(eventoId: number) {
  return db
    .select()
    .from(eventosMediaTable)
    .where(eq(eventosMediaTable.eventoId, eventoId))
    .orderBy(asc(eventosMediaTable.orden));
}

// ─── GET /eventos-full ─────────────────────────────────────────────────────
// Público. Lista los eventos según el rol:
//   visitante -> solo "próximos" publicados
//   usuario   -> próximos + inscripción abierta
//   socio     -> todos los publicados
//   directiva -> todos (publicados o no)
router.get("/eventos-full", optionalAuth, async (req, res): Promise<void> => {
  const { tipo, estado, publicado } = req.query;
  const roles = userRoles(req);
  const esDirectiva = roles.some((r) => ROLES_DIRECTIVA.includes(r));

  try {
    const conditions: ReturnType<typeof eq>[] = [];
    if (tipo)      conditions.push(eq(eventosFullTable.tipo, String(tipo)));
    if (estado)    conditions.push(eq(eventosFullTable.estado, String(estado)));
    if (publicado !== undefined)
      conditions.push(eq(eventosFullTable.publicado, publicado === "true"));

    // Visibilidad por rol (los no-publicados solo para directiva)
    if (!esDirectiva) {
      conditions.push(eq(eventosFullTable.publicado, true));
      const states = visibleStatesFor(req);
      if (states && states.length > 0) {
        conditions.push(inArray(eventosFullTable.estado, states));
      }
    }

    const rows = await db
      .select()
      .from(eventosFullTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(eventosFullTable.fechaInicio));

    res.json({
      items: rows.map((r) => sanitizeForRole(r as unknown as Record<string, unknown>, req)),
      total: rows.length,
    });
  } catch (err) {
    res.status(500).json({ error: "Error listando eventos", detalle: String(err) });
  }
});

// ─── GET /eventos-full/:id ─────────────────────────────────────────────────
// Público. Devuelve un evento con sus subactividades y multimedia.
router.get("/eventos-full/:id", optionalAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  try {
    const [evento] = await db
      .select()
      .from(eventosFullTable)
      .where(eq(eventosFullTable.id, id))
      .limit(1);

    if (!evento) { res.status(404).json({ error: "Evento no encontrado" }); return; }

    const roles = userRoles(req);
    const esDirectiva = roles.some((r) => ROLES_DIRECTIVA.includes(r));
    if (!esDirectiva && !evento.publicado) {
      res.status(404).json({ error: "Evento no encontrado" });
      return;
    }
    const states = visibleStatesFor(req);
    if (states && states.length > 0 && !states.includes(String(evento.estado ?? ""))) {
      res.status(404).json({ error: "Evento no encontrado" });
      return;
    }

    const [subacts, media] = await Promise.all([
      fetchSubacts(id),
      fetchMedia(id),
    ]);

    const subactsWithMedia = subacts.map((s) => ({
      ...s,
      media: media.filter((m) => m.subactId === s.id),
    }));

    const safe = sanitizeForRole(evento as unknown as Record<string, unknown>, req);
    res.json({
      ...safe,
      subactividades: subactsWithMedia,
      media: media.filter((m) => m.subactId === null),
      puedeInscribirse: isSocio(req.user),
    });
  } catch (err) {
    res.status(500).json({ error: "Error obteniendo evento", detalle: String(err) });
  }
});

// ─── POST /eventos-full ────────────────────────────────────────────────────
// Directiva: crea un evento nuevo.
router.post("/eventos-full", requireAuth, requireRole(...ROLES_DIRECTIVA), async (req, res): Promise<void> => {
  const body = req.body ?? {};
  if (!body.nombre) {
    res.status(400).json({ error: "El campo 'nombre' es obligatorio" });
    return;
  }

  try {
    const [inserted] = await db
      .insert(eventosFullTable)
      .values({
        tipo:                body.tipo               ?? "excursion",
        estado:              body.estado             ?? "prevista",
        nombre:              body.nombre,
        nombreEu:            body.nombreEu            ?? null,
        descripcion:         body.descripcion         ?? null,
        descripcionEu:       body.descripcionEu       ?? null,
        fechaInicio:         body.fechaInicio         ?? null,
        fechaFin:            body.fechaFin            ?? null,
        fechaFinInscripcion: body.fechaFinInscripcion ?? null,
        precioInscripcion:   body.precioInscripcion   ?? null,
        precioSuplemento:    body.precioSuplemento    ?? null,
        subactsInscripcion:  body.subactsInscripcion  ?? null,
        subactsSuplemento:   body.subactsSuplemento   ?? null,
        lugar:               body.lugar               ?? null,
        menu:                body.menu                ?? null,
        bus1:                body.bus1                ?? null,
        bus2:                body.bus2                ?? null,
        horaRegreso:         body.horaRegreso         ?? null,
        plazasTotal:         body.plazasTotal         ?? 0,
        plazasDisponibles:   body.plazasDisponibles   ?? body.plazasTotal ?? 0,
        fotoUrl:             body.fotoUrl             ?? null,
        memoriaParticipantes: body.memoriaParticipantes ?? null,
        resumen:             body.resumen             ?? null,
        extra:               body.extra               ?? null,
        publicado:           body.publicado           ?? false,
        createdBy:           req.user?.uid            ?? null,
      })
      .returning();

    if (Array.isArray(body.subactividades) && body.subactividades.length > 0) {
      await db.insert(eventosSubactsTable).values(
        body.subactividades.map((s: Record<string, unknown>, i: number) => ({
          eventoId: inserted.id,
          orden:    (s.orden as number) ?? i + 1,
          nombre:   (s.nombre as string)   ?? null,
          nombreEu: (s.nombreEu as string) ?? null,
          fotoUrl:  (s.fotoUrl as string)  ?? null,
          memoria:  (s.memoria as string)  ?? null,
        }))
      );
    }

    res.status(201).json(inserted);
  } catch (err) {
    res.status(500).json({ error: "Error creando evento", detalle: String(err) });
  }
});

// ─── PUT /eventos-full/:id ─────────────────────────────────────────────────
// Directiva: actualiza un evento completo.
router.put("/eventos-full/:id", requireAuth, requireRole(...ROLES_DIRECTIVA), async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const body = req.body ?? {};

  try {
    await db
      .update(eventosFullTable)
      .set({
        ...(body.tipo                 !== undefined && { tipo:                 body.tipo }),
        ...(body.estado               !== undefined && { estado:               body.estado }),
        ...(body.nombre               !== undefined && { nombre:               body.nombre }),
        ...(body.nombreEu             !== undefined && { nombreEu:             body.nombreEu }),
        ...(body.descripcion          !== undefined && { descripcion:          body.descripcion }),
        ...(body.descripcionEu        !== undefined && { descripcionEu:        body.descripcionEu }),
        ...(body.fechaInicio          !== undefined && { fechaInicio:          body.fechaInicio }),
        ...(body.fechaFin             !== undefined && { fechaFin:             body.fechaFin }),
        ...(body.fechaFinInscripcion  !== undefined && { fechaFinInscripcion: body.fechaFinInscripcion }),
        ...(body.precioInscripcion    !== undefined && { precioInscripcion:    body.precioInscripcion }),
        ...(body.precioSuplemento     !== undefined && { precioSuplemento:     body.precioSuplemento }),
        ...(body.subactsInscripcion   !== undefined && { subactsInscripcion:   body.subactsInscripcion }),
        ...(body.subactsSuplemento    !== undefined && { subactsSuplemento:    body.subactsSuplemento }),
        ...(body.lugar                !== undefined && { lugar:                body.lugar }),
        ...(body.menu                 !== undefined && { menu:                 body.menu }),
        ...(body.bus1                 !== undefined && { bus1:                 body.bus1 }),
        ...(body.bus2                 !== undefined && { bus2:                 body.bus2 }),
        ...(body.horaRegreso          !== undefined && { horaRegreso:          body.horaRegreso }),
        ...(body.plazasTotal          !== undefined && { plazasTotal:          body.plazasTotal }),
        ...(body.plazasDisponibles    !== undefined && { plazasDisponibles:    body.plazasDisponibles }),
        ...(body.fotoUrl              !== undefined && { fotoUrl:              body.fotoUrl }),
        ...(body.memoriaParticipantes !== undefined && { memoriaParticipantes: body.memoriaParticipantes }),
        ...(body.resumen              !== undefined && { resumen:              body.resumen }),
        ...(body.extra                !== undefined && { extra:                body.extra }),
        ...(body.publicado            !== undefined && { publicado:            body.publicado }),
        updatedAt: new Date(),
      })
      .where(eq(eventosFullTable.id, id));

    const [updated] = await db
      .select()
      .from(eventosFullTable)
      .where(eq(eventosFullTable.id, id))
      .limit(1);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Error actualizando evento", detalle: String(err) });
  }
});

// ─── DELETE /eventos-full/:id ──────────────────────────────────────────────
router.delete("/eventos-full/:id", requireAuth, requireRole(...ROLES_DIRECTIVA), async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  try {
    await db.delete(eventosFullTable).where(eq(eventosFullTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error eliminando evento", detalle: String(err) });
  }
});

// ─── Subactividades ───────────────────────────────────────────────────────

router.get("/eventos-full/:id/subacts", optionalAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  try {
    const rows = await fetchSubacts(id);
    res.json({ items: rows });
  } catch (err) {
    res.status(500).json({ error: "Error obteniendo subactividades", detalle: String(err) });
  }
});

router.post("/eventos-full/:id/subacts", requireAuth, requireRole(...ROLES_DIRECTIVA), async (req, res): Promise<void> => {
  const eventoId = parseInt(String(req.params.id), 10);
  const { orden = 1, nombre, nombreEu, fotoUrl, memoria } = req.body ?? {};

  try {
    const [inserted] = await db
      .insert(eventosSubactsTable)
      .values({ eventoId, orden, nombre, nombreEu, fotoUrl, memoria })
      .returning();
    res.status(201).json(inserted);
  } catch (err) {
    res.status(500).json({ error: "Error creando subactividad", detalle: String(err) });
  }
});

router.put("/eventos-full/:id/subacts/:subId", requireAuth, requireRole(...ROLES_DIRECTIVA), async (req, res): Promise<void> => {
  const subId = parseInt(String(req.params.subId), 10);
  const { orden, nombre, nombreEu, fotoUrl, memoria } = req.body ?? {};

  try {
    await db
      .update(eventosSubactsTable)
      .set({
        ...(orden    !== undefined && { orden }),
        ...(nombre   !== undefined && { nombre }),
        ...(nombreEu !== undefined && { nombreEu }),
        ...(fotoUrl  !== undefined && { fotoUrl }),
        ...(memoria  !== undefined && { memoria }),
        updatedAt: new Date(),
      })
      .where(eq(eventosSubactsTable.id, subId));

    const [updated] = await db
      .select()
      .from(eventosSubactsTable)
      .where(eq(eventosSubactsTable.id, subId))
      .limit(1);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Error actualizando subactividad", detalle: String(err) });
  }
});

router.delete("/eventos-full/:id/subacts/:subId", requireAuth, requireRole(...ROLES_DIRECTIVA), async (req, res): Promise<void> => {
  const subId = parseInt(String(req.params.subId), 10);
  try {
    await db.delete(eventosSubactsTable).where(eq(eventosSubactsTable.id, subId));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error eliminando subactividad", detalle: String(err) });
  }
});

// ─── Multimedia ───────────────────────────────────────────────────────────

router.get("/eventos-full/:id/media", optionalAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  try {
    const rows = await fetchMedia(id);
    res.json({ items: rows });
  } catch (err) {
    res.status(500).json({ error: "Error obteniendo multimedia", detalle: String(err) });
  }
});

router.post("/eventos-full/:id/media", requireAuth, requireRole(...ROLES_DIRECTIVA), async (req, res): Promise<void> => {
  const eventoId = parseInt(String(req.params.id), 10);
  const { subactId, tipoMedia = "foto", url, nombreArchivo, mimeType, tamanoBytes, orden = 0, descripcion, descripcionEu } = req.body ?? {};

  if (!url) { res.status(400).json({ error: "El campo 'url' es obligatorio" }); return; }

  try {
    const [inserted] = await db
      .insert(eventosMediaTable)
      .values({ eventoId, subactId: subactId ?? null, tipoMedia, url, nombreArchivo, mimeType, tamanoBytes, orden, descripcion, descripcionEu, subidoPor: req.user?.uid ?? null })
      .returning();
    res.status(201).json(inserted);
  } catch (err) {
    res.status(500).json({ error: "Error guardando media", detalle: String(err) });
  }
});

router.delete("/eventos-full/:id/media/:mediaId", requireAuth, requireRole(...ROLES_DIRECTIVA), async (req, res): Promise<void> => {
  const mediaId = parseInt(String(req.params.mediaId), 10);
  try {
    await db.delete(eventosMediaTable).where(eq(eventosMediaTable.id, mediaId));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error eliminando media", detalle: String(err) });
  }
});

export default router;
