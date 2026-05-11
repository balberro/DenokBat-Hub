import { pgTable, serial, varchar, text, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const actasAsambleaTable = pgTable("db_actas_asamblea", {
  id: serial("id").primaryKey(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  tituloEu: varchar("titulo_eu", { length: 255 }),
  pdfUrl: text("pdf_url").notNull(),
  fechaActa: date("fecha_acta").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertActaAsambleaSchema = createInsertSchema(actasAsambleaTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertActaAsamblea = z.infer<typeof insertActaAsambleaSchema>;
export type ActaAsamblea = typeof actasAsambleaTable.$inferSelect;
