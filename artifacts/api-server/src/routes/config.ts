import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { configTable } from "@workspace/db/schema";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function describeDbError(err: unknown): string {
  const parts: string[] = [];
  const visit = (e: unknown, depth: number) => {
    if (depth > 8 || e == null) return;
    if (e instanceof Error) {
      parts.push(e.message);
      const any = e as unknown as Record<string, unknown>;
      if (typeof any.code === "string") parts.push(`pg_code=${any.code}`);
      if (typeof any.detail === "string" && any.detail) parts.push(`pg_detail=${any.detail}`);
      if (typeof any.severity === "string") parts.push(`pg_severity=${any.severity}`);
      visit(e.cause, depth + 1);
    } else {
      parts.push(String(e));
    }
  };
  visit(err, 0);
  return parts.filter(Boolean).join(" | ");
}

const PUBLIC_CONFIG_KEYS = new Set([
  "home.hero_title",
  "home.hero_subtitle",
  "home.hero_subtitle_eu",
  "home.hero_image",
  "footer.logo_text",
  "footer.logo_text_eu",
  "footer.contact.address",
  "footer.contact.phone",
  "footer.contact.email",
  "footer.contact.whatsapp",
  "footer.contact.hours",
  "footer.contact.map_embed",
  // Legacy aliases kept for backward compatibility
  "contact.address",
  "contact.phone",
  "contact.email",
  "contact.whatsapp",
  "contact.hours",
  "contact.map_embed",
  "privacy.policy_title_es",
  "privacy.policy_title_eu",
  "privacy.policy_body_es",
  "privacy.policy_body_eu",
]);

router.get("/config/public", async (_req, res): Promise<void> => {
  try {
    const rows = await db.select().from(configTable);
    const config: Record<string, string | null> = {};
    for (const row of rows) {
      if (!PUBLIC_CONFIG_KEYS.has(row.clave)) continue;
      config[row.clave] = row.valor ?? null;
    }
    res.json(config);
  } catch (err) {
    console.error("[GET /config/public]", err);
    res.status(500).json({
      error: "Error consultando configuración pública",
      detalle: describeDbError(err),
    });
  }
});

router.get("/config", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!["administrador"].includes(user.role)) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }

  try {
    const rows = await db.select().from(configTable);
    const config: Record<string, string | null> = {};
    for (const row of rows) {
      config[row.clave] = row.valor ?? null;
    }
    res.json(config);
  } catch (err) {
    console.error("[GET /config]", err);
    res.status(500).json({
      error: "Error consultando configuración",
      detalle: describeDbError(err),
    });
  }
});

router.put("/config/:clave", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!["administrador"].includes(user.role)) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }

  const { clave } = req.params;
  const { valor } = req.body ?? {};

  try {
    await db.insert(configTable).values({
      clave: String(clave),
      valor: String(valor),
      descripcion: null,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: configTable.clave,
      set: {
        valor: String(valor),
        updatedAt: new Date(),
      },
    });
    res.json({ ok: true, clave, valor });
  } catch (err) {
    res.status(500).json({ error: "Error actualizando configuración", detalle: String(err) });
  }
});

export default router;
