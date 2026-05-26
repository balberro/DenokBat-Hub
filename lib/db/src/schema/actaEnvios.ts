import { pgTable, serial, integer, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Registro de envíos de un acta por correo electrónico.
 *
 * Cada fila representa **un envío** disparado desde el módulo de actas, con
 * la lista de destinatarios materializada (snapshot) y el resultado (ok /
 * error). Útil para histórico y auditoría.
 *
 * Script de migración idempotente: `lib/db/fix-db-acta-envios.sql`.
 */
export const actaEnviosTable = pgTable("db_acta_envios", {
  id: serial("id").primaryKey(),
  actaId: integer("acta_id").notNull(),
  enviadoPor: integer("enviado_por"),
  enviadoEn: timestamp("enviado_en", { withTimezone: true }).defaultNow().notNull(),
  asunto: text("asunto").notNull(),
  mensaje: text("mensaje"),
  /** Array JSON: [{ email, nombre? }, ...] */
  destinatarios: jsonb("destinatarios").default([]).notNull(),
  totalDestinos: integer("total_destinos").default(0).notNull(),
  ok: boolean("ok").default(true).notNull(),
  error: text("error"),
});

export const insertActaEnvioSchema = createInsertSchema(actaEnviosTable).omit({
  id: true,
  enviadoEn: true,
});
export type InsertActaEnvio = z.infer<typeof insertActaEnvioSchema>;
export type ActaEnvio = typeof actaEnviosTable.$inferSelect;
