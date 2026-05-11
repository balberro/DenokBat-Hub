import { pgTable, serial, integer, varchar, text, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const actividadesTable = pgTable("db_actividades", {
  id: serial("id").primaryKey(),
  odooId: integer("odoo_id").unique(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  nombreEu: varchar("nombre_eu", { length: 255 }),
  descripcion: text("descripcion"),
  descripcionEu: text("descripcion_eu"),
  categoria: varchar("categoria", { length: 100 }),
  horario: varchar("horario", { length: 255 }),
  plazasTotal: integer("plazas_total").default(0),
  plazasDisponibles: integer("plazas_disponibles").default(0),
  precio: decimal("precio", { precision: 10, scale: 2 }).default("0"),
  estado: varchar("estado", { length: 20 }).default("disponible"),
  fotoUrl: text("foto_url"),
  odooSyncedAt: timestamp("odoo_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertActividadSchema = createInsertSchema(actividadesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertActividad = z.infer<typeof insertActividadSchema>;
export type Actividad = typeof actividadesTable.$inferSelect;
