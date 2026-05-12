import { Router, type IRouter } from "express";
import { requireAuth, requireRole } from "../middlewares/auth";
import { applyAsociacionDatosPatch, fieldKeys, loadAsociacionDatos, type AsociacionDatosPublic } from "../lib/asociacionConfig";

const router: IRouter = Router();

const ASOCIACION_EDIT_ROLES = ["contable", "administrador"] as const;

/** Lectura pública: textos legales y cuotas visibles en formularios sin sesión. */
router.get("/asociacion", async (_req, res): Promise<void> => {
  try {
    const datos = await loadAsociacionDatos();
    res.json({ datos });
  } catch (err) {
    console.error("[GET /asociacion]", err);
    res.status(500).json({ error: "Error cargando datos de la asociación", detalle: String(err) });
  }
});

router.put("/asociacion", requireAuth, requireRole(...ASOCIACION_EDIT_ROLES), async (req, res): Promise<void> => {
  const body = req.body ?? {};
  const incoming = body.datos ?? body;
  if (!incoming || typeof incoming !== "object") {
    res.status(400).json({ error: "Cuerpo inválido: se espera { datos: { ... } }" });
    return;
  }

  const allowed = new Set(fieldKeys());
  const patch: Partial<AsociacionDatosPublic> = {};
  for (const [k, v] of Object.entries(incoming as Record<string, unknown>)) {
    if (!allowed.has(k as keyof AsociacionDatosPublic)) continue;
    (patch as Record<string, unknown>)[k] = v;
  }

  try {
    const { error } = await applyAsociacionDatosPatch(patch);
    if (error) {
      res.status(400).json({ error });
      return;
    }
    const datos = await loadAsociacionDatos();
    res.json({ ok: true, datos });
  } catch (err) {
    console.error("[PUT /asociacion]", err);
    res.status(500).json({ error: "Error guardando datos de la asociación", detalle: String(err) });
  }
});

/** Misma lectura que GET /asociacion (útil si en el futuro se restringe el público). */
router.get("/asociacion/admin", requireAuth, requireRole(...ASOCIACION_EDIT_ROLES), async (_req, res): Promise<void> => {
  try {
    const datos = await loadAsociacionDatos();
    res.json({ datos });
  } catch (err) {
    console.error("[GET /asociacion/admin]", err);
    res.status(500).json({ error: "Error cargando datos de la asociación", detalle: String(err) });
  }
});

export default router;
