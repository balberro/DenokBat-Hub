import { pgTable, serial, integer, varchar, text, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sociosTable } from "./socios";

export const cargosTable = pgTable("db_cargos", {
  id: serial("id").primaryKey(),
  codigo: varchar("codigo", { length: 100 }).notNull().unique(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  nombreEu: varchar("nombre_eu", { length: 255 }),
  ambito: varchar("ambito", { length: 30 }).notNull().default("directivo"), // fundador | directivo | delegado
  activo: integer("activo").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const historicoCargosTable = pgTable("db_historico_cargos", {
  id: serial("id").primaryKey(),
  socioId: integer("socio_id").notNull().references(() => sociosTable.id, { onDelete: "cascade" }),
  cargoId: integer("cargo_id").notNull().references(() => cargosTable.id, { onDelete: "cascade" }),
  fechaInicio: date("fecha_inicio").notNull(),
  fechaFin: date("fecha_fin"),
  descripcion: text("descripcion"),
  descripcionEu: text("descripcion_eu"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCargoSchema = createInsertSchema(cargosTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHistoricoCargoSchema = createInsertSchema(historicoCargosTable).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertCargo = z.infer<typeof insertCargoSchema>;
export type InsertHistoricoCargo = z.infer<typeof insertHistoricoCargoSchema>;

export type Cargo = typeof cargosTable.$inferSelect;
export type HistoricoCargo = typeof historicoCargosTable.$inferSelect;
