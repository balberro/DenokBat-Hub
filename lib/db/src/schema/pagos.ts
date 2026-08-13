import { pgTable, serial, integer, varchar, text, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pagosTable = pgTable("db_pagos", {
  id: serial("id").primaryKey(),
  odooId: integer("odoo_id").unique(),
  socioId: integer("socio_id"),
  inscripcionId: integer("inscripcion_id"),
  concepto: varchar("concepto", { length: 255 }).notNull(),
  importe: decimal("importe", { precision: 10, scale: 2 }).notNull(),
  metodo: varchar("metodo", { length: 50 }),
  estado: varchar("estado", { length: 30 }).default("pendiente"),
  fechaPago: timestamp("fecha_pago"),
  referencia: varchar("referencia", { length: 100 }),
  justificanteUrl: text("justificante_url"),
  justificanteSubidoEn: timestamp("justificante_subido_en"),
  notas: text("notas"),
  /** Identidad Odoo por modelo (no reutilizar odoo_id): account.move */
  moveId: integer("move_id").unique(),
  /** Identidad Odoo: account.payment */
  paymentId: integer("payment_id").unique(),
  idempotencyKey: varchar("idempotency_key", { length: 64 }).unique(),
  odooSyncStatus: varchar("odoo_sync_status", { length: 30 }).default("pending"),
  odooSyncError: text("odoo_sync_error"),
  odooSyncAttempts: integer("odoo_sync_attempts").default(0),
  odooSyncedAt: timestamp("odoo_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPagoSchema = createInsertSchema(pagosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPago = z.infer<typeof insertPagoSchema>;
export type Pago = typeof pagosTable.$inferSelect;
