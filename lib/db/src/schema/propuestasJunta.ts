import { pgTable, serial, integer, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Buzón de propuestas a la junta.
 *
 * V1: las propuestas se generan exclusivamente desde sugerencias
 * (`origen_tipo = 'sugerencia'`). El paso de una sugerencia a estado
 * `presentada` y la creación de la propuesta es atómico (transacción en
 * la API). Otras vías de origen se contemplarán en versiones futuras.
 *
 * Script de migración idempotente: `lib/db/fix-db-propuestas-junta.sql`.
 */
export const propuestasJuntaTable = pgTable("db_propuestas_junta", {
  id: serial("id").primaryKey(),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).defaultNow().notNull(),
  /** Usuario directivo que creó la propuesta. */
  creadoPor: integer("creado_por"),
  /** Origen V1: solo 'sugerencia'. */
  origenTipo: varchar("origen_tipo", { length: 40 }).default("sugerencia").notNull(),
  /** FK opcional al recurso origen (db_sugerencias.id cuando origen_tipo='sugerencia'). */
  origenId: integer("origen_id"),
  denominacion: varchar("denominacion", { length: 500 }).notNull(),
  descripcion: text("descripcion").notNull(),
  /** rechazada | mas_aportaciones | abrir_expediente */
  decisionSolicitada: varchar("decision_solicitada", { length: 30 }).notNull(),
  /** pendiente | en_orden_dia | resuelta */
  estadoBuzon: varchar("estado_buzon", { length: 30 }).default("pendiente").notNull(),
  /** Referencia a la junta convocada cuando entra en el orden del día (futuro). */
  juntaId: integer("junta_id"),
  /** rechazada | mas_aportaciones | expediente_abierto (decisión tras la junta). */
  resultado: varchar("resultado", { length: 30 }),
  resueltaEn: timestamp("resuelta_en", { withTimezone: true }),
  /** Enlace al expediente creado, si resultado = expediente_abierto. */
  expedienteId: integer("expediente_id"),
  /** Notas internas de la directiva / actas. */
  observaciones: text("observaciones"),
  /**
   * Antecedentes (V2): contexto histórico de la propuesta. Sugerencias,
   * aportaciones y, opcionalmente, un documento adjunto. Se llevan al punto
   * del orden del día pero NO se copian al acta.
   */
  antecedentes: text("antecedentes"),
  antecedentesUrl: text("antecedentes_url"),
  antecedentesFilename: text("antecedentes_filename"),
  antecedentesSize: integer("antecedentes_size"),
  antecedentesSubidoEn: timestamp("antecedentes_subido_en", { withTimezone: true }),
  antecedentesSubidoPor: integer("antecedentes_subido_por"),
});

export const insertPropuestaJuntaSchema = createInsertSchema(propuestasJuntaTable).omit({
  id: true,
  creadoEn: true,
  actualizadoEn: true,
});
export type InsertPropuestaJunta = z.infer<typeof insertPropuestaJuntaSchema>;
export type PropuestaJunta = typeof propuestasJuntaTable.$inferSelect;

export const PROPUESTA_DECISIONES_SOLICITADAS = [
  "rechazada",
  "mas_aportaciones",
  "abrir_expediente",
  "cerrar_expediente",
] as const;
export type PropuestaDecisionSolicitada = (typeof PROPUESTA_DECISIONES_SOLICITADAS)[number];

/**
 * `borrador` (V2): la propuesta se ha creado pero NO se ha presentado al
 * buzón todavía; solo es visible al directivo que la edita. Pasa a
 * `pendiente` con la acción explícita "Presentar a la junta".
 */
export const PROPUESTA_ESTADOS_BUZON = [
  "borrador",
  "pendiente",
  "en_orden_dia",
  "resuelta",
] as const;
export type PropuestaEstadoBuzon = (typeof PROPUESTA_ESTADOS_BUZON)[number];

export const PROPUESTA_RESULTADOS = [
  "rechazada",
  "mas_aportaciones",
  "expediente_abierto",
  "expediente_cerrado",
] as const;
export type PropuestaResultado = (typeof PROPUESTA_RESULTADOS)[number];
