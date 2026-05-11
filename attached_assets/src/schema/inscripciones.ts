import { pgTable, serial, integer, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const inscripcionesTable = pgTable("db_inscripciones", {
  id: serial("id").primaryKey(),
  socioId: integer("socio_id"),
  eventoId: integer("evento_id"),
  actividadId: integer("actividad_id"),
  tipo: varchar("tipo", { length: 20 }).notNull(),
  estado: varchar("estado", { length: 30 }).default("pendiente"),
  paradaBus: varchar("parada_bus", { length: 255 }),
  subactividad: varchar("subactividad", { length: 255 }),
  observaciones: text("observaciones"),
  fechaInscripcion: timestamp("fecha_inscripcion").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInscripcionSchema = createInsertSchema(inscripcionesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInscripcion = z.infer<typeof insertInscripcionSchema>;
export type Inscripcion = typeof inscripcionesTable.$inferSelect;
