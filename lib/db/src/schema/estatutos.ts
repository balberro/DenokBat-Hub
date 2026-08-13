import { pgTable, serial, varchar, text, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const estatutosTable = pgTable("db_estatutos", {
  id: serial("id").primaryKey(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  tituloEu: varchar("titulo_eu", { length: 255 }),
  pdfUrl: text("pdf_url").notNull(),
  pdfUrlEu: text("pdf_url_eu"),
  vigenciaDesde: date("vigencia_desde").notNull(),
  vigenciaHasta: date("vigencia_hasta"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEstatutoSchema = createInsertSchema(estatutosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEstatuto = z.infer<typeof insertEstatutoSchema>;
export type Estatuto = typeof estatutosTable.$inferSelect;
