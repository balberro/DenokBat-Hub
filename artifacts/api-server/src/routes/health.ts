import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";
import { versionInfo } from "../lib/version";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// ── GET /version ───────────────────────────────────────────────────────────
// Información de versión/build de la app. Solo accesible para administradores.
// Sirve para comprobar qué versión está desplegada en cada entorno.
router.get("/version", requireAuth, requireRole("administrador"), (_req, res) => {
  res.json(versionInfo());
});

export default router;
