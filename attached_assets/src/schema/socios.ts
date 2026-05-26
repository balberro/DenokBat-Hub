import { pgTable, serial, integer, varchar, text, char, date, timestamp, decimal, boolean } from "drizzle-orm/pg-core";
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
  poblacion: varchar("poblacion", { length: 255 }),
  provincia: varchar("provincia", { length: 255 }),
  dni: varchar("dni", { length: 20 }),
  fechaNacimiento: date("fecha_nacimiento"),
  fechaFallecimiento: date("fecha_fallecimiento"),
  fechaAlta: date("fecha_alta"),
  numeroSocio: varchar("numero_socio", { length: 50 }),
  genero: char("genero", { length: 1 }),
  estado: varchar("estado", { length: 20 }).default("solicitante"),
  tipoSocio: varchar("tipo_socio", { length: 30 }).default("ordinario"),
  tipologia: varchar("tipologia", { length: 30 }).default("numeraria"),
  membershipEstado: varchar("membership_estado", { length: 50 }),
  membershipDesde: date("membership_desde"),
  membershipHasta: date("membership_hasta"),
  membershipCuota: decimal("membership_cuota", { precision: 10, scale: 2 }),
  grupoId: integer("grupo_id"),
  grupoManual: boolean("grupo_manual").notNull().default(false),
  avatarUrl: text("avatar_url"),
  odooSyncedAt: timestamp("odoo_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSocioSchema = createInsertSchema(sociosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSocio = z.infer<typeof insertSocioSchema>;
export type Socio = typeof sociosTable.$inferSelect;
