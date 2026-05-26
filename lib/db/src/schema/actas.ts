import { pgTable, serial, integer, varchar, text, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Actas (V1).
 *
 * - Roles: contable escribe, directivo lee.
 * - Origen: una convocatoria. El acta copia sus puntos para preservar el
 *   contenido debatido aunque después cambie la convocatoria.
 * - Estados: `borrador` -> `completa` -> `firmada`.
 * - Cada punto puede recoger acuerdo, resultado de propuesta y acción prevista
 *   sobre expediente (`abrir`, `continuar`, `cerrar`).
 *
 * Script de migración idempotente: `lib/db/fix-db-actas.sql`.
 */
export const actasTable = pgTable("db_actas", {
  id: serial("id").primaryKey(),
  numero: integer("numero"),
  convocatoriaId: integer("convocatoria_id"),
  titulo: varchar("titulo", { length: 500 }).notNull(),
  fecha: date("fecha"),
  /** borrador | completa | firmada */
  estado: varchar("estado", { length: 30 }).default("borrador").notNull(),
  asistentes: text("asistentes"),
  resumen: text("resumen"),
  observaciones: text("observaciones"),
  completadaEn: timestamp("completada_en", { withTimezone: true }),
  firmadaEn: timestamp("firmada_en", { withTimezone: true }),
  /**
   * Archivo PDF del acta firmada (subida manual).
   *
   * - `pdf_url`: ruta pública servida bajo `/uploads/actas/...`.
   * - `pdf_filename`: nombre amigable usado al descargar
   *   (formato `YYYY-MM-<slug-titulo>[-N].pdf`).
   * - `pdf_anyo_mes`: clave `YYYY-MM` que facilita el listado por mes y la
   *   detección de duplicados al firmar otra acta del mismo mes.
   */
  pdfUrl: text("pdf_url"),
  pdfFilename: text("pdf_filename"),
  pdfAnyoMes: varchar("pdf_anyo_mes", { length: 7 }),
  pdfSize: integer("pdf_size"),
  pdfSubidoEn: timestamp("pdf_subido_en", { withTimezone: true }),
  pdfSubidoPor: integer("pdf_subido_por"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).defaultNow().notNull(),
  creadoPor: integer("creado_por"),
});

export const actaPuntosTable = pgTable("db_acta_puntos", {
  id: serial("id").primaryKey(),
  actaId: integer("acta_id").notNull(),
  convocatoriaPuntoId: integer("convocatoria_punto_id"),
  orden: integer("orden").default(0).notNull(),
  propuestaId: integer("propuesta_id"),
  titulo: varchar("titulo", { length: 500 }),
  descripcion: text("descripcion"),
  acuerdo: text("acuerdo"),
  /** rechazada | mas_aportaciones | expediente_abierto */
  resultadoPropuesta: varchar("resultado_propuesta", { length: 30 }),
  /** abrir | continuar | cerrar */
  expedienteAccion: varchar("expediente_accion", { length: 20 }),
  expedienteId: integer("expediente_id"),
  notas: text("notas"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).defaultNow().notNull(),
});

export const insertActaSchema = createInsertSchema(actasTable).omit({
  id: true,
  creadoEn: true,
  actualizadoEn: true,
});
export type InsertActa = z.infer<typeof insertActaSchema>;
export type Acta = typeof actasTable.$inferSelect;

export const insertActaPuntoSchema = createInsertSchema(actaPuntosTable).omit({
  id: true,
  creadoEn: true,
  actualizadoEn: true,
});
export type InsertActaPunto = z.infer<typeof insertActaPuntoSchema>;
export type ActaPunto = typeof actaPuntosTable.$inferSelect;

export const ACTA_ESTADOS = ["borrador", "completa", "firmada"] as const;
export type ActaEstado = (typeof ACTA_ESTADOS)[number];

export const ACTA_RESULTADOS_PROPUESTA = [
  "rechazada",
  "mas_aportaciones",
  "expediente_abierto",
  "expediente_cerrado",
] as const;
export type ActaResultadoPropuesta = (typeof ACTA_RESULTADOS_PROPUESTA)[number];

export const ACTA_EXPEDIENTE_ACCIONES = ["abrir", "continuar", "cerrar"] as const;
export type ActaExpedienteAccion = (typeof ACTA_EXPEDIENTE_ACCIONES)[number];
