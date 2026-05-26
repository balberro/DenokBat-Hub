import { pgTable, serial, integer, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Mantener alineado con lib/db/src/schema/sugerencias.ts */
export const sugerenciasTable = pgTable("db_sugerencias", {
  id: serial("id").primaryKey(),
  parentId: integer("parent_id"),
  socioId: integer("socio_id"),
  categoria: varchar("categoria", { length: 100 }),
  tema: varchar("tema", { length: 500 }),
  texto: text("texto").notNull(),
  estado: varchar("estado", { length: 30 }).default("nueva").notNull(),
  observacionesEstado: text("observaciones_estado"),
  respuesta: text("respuesta"),
  fechaRespuesta: timestamp("fecha_respuesta"),
  aliasPublicacion: varchar("alias_publicacion", { length: 200 }),
  adjuntoUrl: text("adjunto_url"),
  numeroSugerencia: integer("numero_sugerencia"),
  fechaEntrada: timestamp("fecha_entrada").defaultNow(),
  expedienteId: integer("expediente_id"),
  nombreRemitente: varchar("nombre_remitente", { length: 255 }),
  emailRemitente: varchar("email_remitente", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSugerenciaSchema = createInsertSchema(sugerenciasTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSugerencia = z.infer<typeof insertSugerenciaSchema>;
export type Sugerencia = typeof sugerenciasTable.$inferSelect;
