import { pgTable, serial, integer, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sugerenciasTable = pgTable("db_sugerencias", {
  id: serial("id").primaryKey(),
  socioId: integer("socio_id"),
  categoria: varchar("categoria", { length: 100 }),
  texto: text("texto").notNull(),
  estado: varchar("estado", { length: 30 }).default("pendiente"),
  respuesta: text("respuesta"),
  fechaRespuesta: timestamp("fecha_respuesta"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSugerenciaSchema = createInsertSchema(sugerenciasTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSugerencia = z.infer<typeof insertSugerenciaSchema>;
export type Sugerencia = typeof sugerenciasTable.$inferSelect;
