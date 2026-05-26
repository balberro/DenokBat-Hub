import { pgTable, serial, integer, varchar, text, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Acciones de un expediente (V1).
 *
 * - Cada acción puede estar vinculada a un movimiento concreto del expediente
 *   (`movimiento_id` apunta a `db_expediente_movimientos`) o ser independiente
 *   (creada manualmente desde la ficha del expediente).
 * - Estado de la acción: `pendiente` | `hecha` | `cancelada`.
 * - Responsable: usuario del sistema (FK a `db_users`).
 *
 * Script de migración idempotente: `lib/db/fix-db-expediente-acciones.sql`.
 */
export const expedienteAccionesTable = pgTable("db_expediente_acciones", {
  id: serial("id").primaryKey(),
  expedienteId: integer("expediente_id").notNull(),
  movimientoId: integer("movimiento_id"),
  descripcion: text("descripcion").notNull(),
  responsableUserId: integer("responsable_user_id"),
  estado: varchar("estado", { length: 20 }).default("pendiente").notNull(),
  plazo: date("plazo"),
  observaciones: text("observaciones"),
  completadaEn: timestamp("completada_en", { withTimezone: true }),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).defaultNow().notNull(),
  creadoPor: integer("creado_por"),
});

export const insertExpedienteAccionSchema = createInsertSchema(expedienteAccionesTable).omit({
  id: true,
  creadoEn: true,
  actualizadoEn: true,
});
export type InsertExpedienteAccion = z.infer<typeof insertExpedienteAccionSchema>;
export type ExpedienteAccion = typeof expedienteAccionesTable.$inferSelect;

export const EXPEDIENTE_ACCION_ESTADOS = ["pendiente", "hecha", "cancelada"] as const;
export type ExpedienteAccionEstado = (typeof EXPEDIENTE_ACCION_ESTADOS)[number];
