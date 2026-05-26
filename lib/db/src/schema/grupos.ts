import { pgTable, serial, integer, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const gruposTable = pgTable("db_grupos", {
  id: serial("id").primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  nombreEu: varchar("nombre_eu", { length: 255 }),
  delegadoId: integer("delegado_id"),
  /** Poblaciones que abarca el grupo; los socios con esa poblacion entran al grupo por defecto. */
  poblaciones: text("poblaciones").array().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertGrupoSchema = createInsertSchema(gruposTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGrupo = z.infer<typeof insertGrupoSchema>;
export type Grupo = typeof gruposTable.$inferSelect;
