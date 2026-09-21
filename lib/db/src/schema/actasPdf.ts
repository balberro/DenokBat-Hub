import { pgTable, serial, integer, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * PDF firmado de un acta (documento externo).
 *
 * - Relación 1:1 con `db_actas` (un acta, un único PDF firmado vigente).
 * - El PDF **siempre es un documento externo**: se firma fuera de la app y
 *   aquí solo se archiva el fichero subido.
 * - `pdfUrl` guarda la **URL completa** del archivo servido bajo
 *   `/uploads/actas/...`.
 * - `pdfAnyoMes` (clave `YYYY-MM`) facilita el listado por mes y la detección
 *   de duplicados.
 *
 * Migración idempotente: `lib/db/fix-db-actas-aceptada.sql`.
 */
export const actasPdfTable = pgTable("db_actas_pdf", {
  id: serial("id").primaryKey(),
  actaId: integer("acta_id").notNull().unique(),
  /** URL completa del PDF firmado (p. ej. `/uploads/actas/2026/05/....pdf`). */
  pdfUrl: text("pdf_url").notNull(),
  pdfFilename: text("pdf_filename"),
  pdfAnyoMes: varchar("pdf_anyo_mes", { length: 7 }),
  pdfSize: integer("pdf_size"),
  subidoEn: timestamp("subido_en", { withTimezone: true }).defaultNow().notNull(),
  subidoPor: integer("subido_por"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).defaultNow().notNull(),
});

export const insertActaPdfSchema = createInsertSchema(actasPdfTable).omit({
  id: true,
  creadoEn: true,
  actualizadoEn: true,
});
export type InsertActaPdf = z.infer<typeof insertActaPdfSchema>;
export type ActaPdf = typeof actasPdfTable.$inferSelect;
