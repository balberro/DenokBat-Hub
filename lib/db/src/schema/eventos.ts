import { pgTable, serial, integer, varchar, text, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventosTable = pgTable("db_eventos", {
  id: serial("id").primaryKey(),
  odooId: integer("odoo_id").unique(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  nombreEu: varchar("nombre_eu", { length: 255 }),
  descripcion: text("descripcion"),
  descripcionEu: text("descripcion_eu"),
  fechaInicio: timestamp("fecha_inicio").notNull(),
  fechaFin: timestamp("fecha_fin"),
  lugar: varchar("lugar", { length: 255 }),
  plazasTotal: integer("plazas_total").default(0),
  plazasDisponibles: integer("plazas_disponibles").default(0),
  precio: decimal("precio", { precision: 10, scale: 2 }).default("0"),
  estado: varchar("estado", { length: 20 }).default("borrador"),
  fotoUrl: text("foto_url"),
  odooSyncedAt: timestamp("odoo_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEventoSchema = createInsertSchema(eventosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEvento = z.infer<typeof insertEventoSchema>;
export type Evento = typeof eventosTable.$inferSelect;
