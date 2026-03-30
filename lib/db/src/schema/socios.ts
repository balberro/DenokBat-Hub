import { pgTable, serial, integer, varchar, text, char, date, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sociosTable = pgTable("db_socios", {
  id: serial("id").primaryKey(),
  odooId: integer("odoo_id").unique(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  apellidos: varchar("apellidos", { length: 255 }),
  email: varchar("email", { length: 255 }),
  telefono: varchar("telefono", { length: 50 }),
  direccion: text("direccion"),
  dni: varchar("dni", { length: 20 }),
  fechaNacimiento: date("fecha_nacimiento"),
  fechaAlta: date("fecha_alta"),
  numeroSocio: varchar("numero_socio", { length: 50 }),
  genero: char("genero", { length: 1 }),
  estado: varchar("estado", { length: 20 }).default("activo"),
  grupoId: integer("grupo_id"),
  avatarUrl: text("avatar_url"),
  odooSyncedAt: timestamp("odoo_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSocioSchema = createInsertSchema(sociosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSocio = z.infer<typeof insertSocioSchema>;
export type Socio = typeof sociosTable.$inferSelect;
