import { pgTable, serial, integer, varchar, text, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Convocatorias (V1).
 *
 * - Roles: contable escribe, directivo lee. Entrada de menú en ambos.
 * - Estados: `borrador` → `publicada` → `celebrada`.
 * - Tipos V1 (varchar libre, ampliable sin migración): `junta_directiva`,
 *   `asamblea_general`, `delegados`, `otros`.
 * - Orden del día: cada punto vive en `db_convocatoria_puntos` y puede ser:
 *   - **Ligado a propuesta** (propuesta_id != NULL). El título/descripción
 *     visibles se toman de la propuesta; el campo `notas` permite añadir
 *     observaciones específicas del punto.
 *   - **Punto libre** (propuesta_id NULL). Requiere `titulo` no vacío.
 * - Inclusión de propuesta atómica: añadir un punto ligado a una propuesta
 *   actualiza `db_propuestas_junta` a `estado_buzon='en_orden_dia'` y rellena
 *   `junta_id = convocatoria_id`. Al quitar el punto se revierte a
 *   `pendiente`/`junta_id=NULL`. Una propuesta solo puede pertenecer a una
 *   convocatoria a la vez (índice único parcial).
 *
 * Script de migración idempotente: `lib/db/fix-db-convocatorias.sql`.
 */
export const convocatoriasTable = pgTable("db_convocatorias", {
  id: serial("id").primaryKey(),
  /** Numeración pública (asignada al crear). */
  numero: integer("numero"),
  /** junta_directiva | asamblea_general | delegados | otros (ampliable). */
  tipo: varchar("tipo", { length: 40 }).default("junta_directiva").notNull(),
  titulo: varchar("titulo", { length: 500 }).notNull(),
  fecha: date("fecha"),
  /** Texto libre (HH:MM, o "18:00 - 20:00"). */
  hora: varchar("hora", { length: 20 }),
  lugar: varchar("lugar", { length: 500 }),
  /** borrador | publicada | celebrada */
  estado: varchar("estado", { length: 30 }).default("borrador").notNull(),
  observaciones: text("observaciones"),
  publicadaEn: timestamp("publicada_en", { withTimezone: true }),
  celebradaEn: timestamp("celebrada_en", { withTimezone: true }),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).defaultNow().notNull(),
  creadoPor: integer("creado_por"),
});

export const convocatoriaPuntosTable = pgTable("db_convocatoria_puntos", {
  id: serial("id").primaryKey(),
  convocatoriaId: integer("convocatoria_id").notNull(),
  orden: integer("orden").default(0).notNull(),
  /** FK opcional a db_propuestas_junta.id. */
  propuestaId: integer("propuesta_id"),
  titulo: varchar("titulo", { length: 500 }),
  descripcion: text("descripcion"),
  notas: text("notas"),
  /**
   * Antecedentes copiados de la propuesta cuando el punto se origina en el
   * buzón. El **acta** NO los recoge: se quedan en la convocatoria como
   * documentación del orden del día.
   */
  antecedentes: text("antecedentes"),
  antecedentesUrl: text("antecedentes_url"),
  antecedentesFilename: text("antecedentes_filename"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
});

export const insertConvocatoriaSchema = createInsertSchema(convocatoriasTable).omit({
  id: true,
  creadoEn: true,
  actualizadoEn: true,
});
export type InsertConvocatoria = z.infer<typeof insertConvocatoriaSchema>;
export type Convocatoria = typeof convocatoriasTable.$inferSelect;

export const insertConvocatoriaPuntoSchema = createInsertSchema(convocatoriaPuntosTable).omit({
  id: true,
  creadoEn: true,
});
export type InsertConvocatoriaPunto = z.infer<typeof insertConvocatoriaPuntoSchema>;
export type ConvocatoriaPunto = typeof convocatoriaPuntosTable.$inferSelect;

export const CONVOCATORIA_ESTADOS = ["borrador", "publicada", "celebrada"] as const;
export type ConvocatoriaEstado = (typeof CONVOCATORIA_ESTADOS)[number];

export const CONVOCATORIA_TIPOS = [
  "junta_directiva",
  "asamblea_general",
  "delegados",
  "otros",
] as const;
export type ConvocatoriaTipo = (typeof CONVOCATORIA_TIPOS)[number];
