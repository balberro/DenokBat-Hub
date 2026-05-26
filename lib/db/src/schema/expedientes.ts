import { pgTable, serial, integer, varchar, text, timestamp, date, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Gestor de expedientes.
 *
 * Estados:
 *   - `en_curso`   — flujo principal tras apertura por acta de junta.
 *   - `cerrado`    — flujo terminado tras acuerdo de cierre en acta.
 *   - `preparando` — (V2, solo `tipologia='subvenciones'`) el contable está
 *     preparando la solicitud antes de presentarla a la junta.
 *   - `archivado`  — propuesta rechazada por la junta o subvención abandonada.
 *
 * Apertura "convencional": desde una `db_propuestas_junta` resuelta como
 * `expediente_abierto` (campo `propuesta_id`). Para subvenciones, el
 * expediente nace primero en `preparando` y al aprobarse en acta pasa a
 * `en_curso`.
 *
 * Acciones de junta (`abrir`, `continuar`, `cerrar`) se registran como filas
 * en `db_expediente_movimientos`.
 *
 * Cerrar es competencia exclusiva del rol contable (regla de aplicación,
 * no constraint de BD).
 *
 * Scripts de migración idempotentes:
 *   - lib/db/fix-db-expedientes.sql
 *   - lib/db/fix-db-expedientes-estados-v2.sql           (estados preparando/archivado)
 *   - lib/db/fix-db-expediente-documentos.sql            (adjuntos genéricos)
 *   - lib/db/fix-db-expediente-subvencion.sql            (extensión subvenciones)
 *   - lib/db/fix-db-propuestas-junta-origenes-v2.sql     (origen 'subvencion')
 */
export const expedientesTable = pgTable("db_expedientes", {
  id: serial("id").primaryKey(),
  /** Numeración pública (asignada al abrir). */
  numero: integer("numero"),
  denominacion: varchar("denominacion", { length: 500 }).notNull(),
  descripcion: text("descripcion").notNull(),
  /** Tipología ampliable: sugerencias | eventos | actividades | administracion | subvenciones | ... */
  tipologia: varchar("tipologia", { length: 50 }).default("sugerencias").notNull(),
  estado: varchar("estado", { length: 30 }).default("en_curso").notNull(),
  /** Propuesta a la junta que originó la apertura (FK a db_propuestas_junta). */
  propuestaId: integer("propuesta_id"),
  fechaApertura: timestamp("fecha_apertura", { withTimezone: true }).defaultNow().notNull(),
  fechaCierre: timestamp("fecha_cierre", { withTimezone: true }),
  observaciones: text("observaciones"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).defaultNow().notNull(),
  creadoPor: integer("creado_por"),
  cerradoPor: integer("cerrado_por"),
});

export const expedienteMovimientosTable = pgTable("db_expediente_movimientos", {
  id: serial("id").primaryKey(),
  expedienteId: integer("expediente_id").notNull(),
  /** abrir | continuar | cerrar */
  tipo: varchar("tipo", { length: 20 }).notNull(),
  /** Acta de junta donde se decide. Nullable hasta que exista el módulo de actas. */
  actaId: integer("acta_id"),
  fecha: date("fecha").notNull(),
  /** Usuario directivo o contable que registra el movimiento. */
  autorUserId: integer("autor_user_id"),
  notas: text("notas"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
});

export const insertExpedienteSchema = createInsertSchema(expedientesTable).omit({
  id: true,
  creadoEn: true,
  actualizadoEn: true,
});
export type InsertExpediente = z.infer<typeof insertExpedienteSchema>;
export type Expediente = typeof expedientesTable.$inferSelect;

export const insertExpedienteMovimientoSchema = createInsertSchema(expedienteMovimientosTable).omit({
  id: true,
  creadoEn: true,
});
export type InsertExpedienteMovimiento = z.infer<typeof insertExpedienteMovimientoSchema>;
export type ExpedienteMovimiento = typeof expedienteMovimientosTable.$inferSelect;

export const EXPEDIENTE_ESTADOS = ["en_curso", "cerrado", "preparando", "archivado"] as const;
export type ExpedienteEstado = (typeof EXPEDIENTE_ESTADOS)[number];

export const EXPEDIENTE_MOVIMIENTO_TIPOS = ["abrir", "continuar", "cerrar"] as const;
export type ExpedienteMovimientoTipo = (typeof EXPEDIENTE_MOVIMIENTO_TIPOS)[number];

export const EXPEDIENTE_TIPOLOGIAS = [
  "sugerencias",
  "eventos",
  "actividades",
  "administracion",
  "subvenciones",
] as const;
export type ExpedienteTipologia = (typeof EXPEDIENTE_TIPOLOGIAS)[number];

/**
 * Documentos adjuntos a un expediente (genérico).
 *
 * `tipo` es libre, con valores conocidos por la aplicación. Para subvenciones:
 *   decreto | solicitud | resolucion | justif_intermedia |
 *   contestacion_intermedia | justif_final | contestacion_final | otros
 */
export const expedienteDocumentosTable = pgTable("db_expediente_documentos", {
  id: serial("id").primaryKey(),
  expedienteId: integer("expediente_id").notNull(),
  tipo: varchar("tipo", { length: 40 }).default("otros").notNull(),
  /**
   * Origen del documento dentro del ciclo del expediente:
   *  - `flujo`     — adjuntado durante el ciclo activo (preparando, en_curso).
   *  - `historico` — adjuntado a posteriori sobre cerrado/archivado, o en
   *                  alta retroactiva. Solo este origen es borrable cuando el
   *                  expediente ya no está activo.
   */
  origen: varchar("origen", { length: 20 }).default("flujo").notNull(),
  denominacion: varchar("denominacion", { length: 500 }),
  url: text("url").notNull(),
  filename: varchar("filename", { length: 255 }),
  size: integer("size"),
  fechaDocumento: date("fecha_documento"),
  importe: numeric("importe", { precision: 14, scale: 2 }),
  notas: text("notas"),
  subidoEn: timestamp("subido_en", { withTimezone: true }).defaultNow().notNull(),
  subidoPor: integer("subido_por"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
});

export const insertExpedienteDocumentoSchema = createInsertSchema(expedienteDocumentosTable).omit({
  id: true,
  subidoEn: true,
  creadoEn: true,
});
export type InsertExpedienteDocumento = z.infer<typeof insertExpedienteDocumentoSchema>;
export type ExpedienteDocumento = typeof expedienteDocumentosTable.$inferSelect;

export const EXPEDIENTE_DOCUMENTO_TIPOS_SUBVENCION = [
  "decreto",
  "solicitud",
  "resolucion",
  "justif_intermedia",
  "contestacion_intermedia",
  "justif_final",
  "contestacion_final",
  "otros",
] as const;
export type ExpedienteDocumentoTipoSubvencion =
  (typeof EXPEDIENTE_DOCUMENTO_TIPOS_SUBVENCION)[number];

export const EXPEDIENTE_DOCUMENTO_ORIGENES = ["flujo", "historico"] as const;
export type ExpedienteDocumentoOrigen = (typeof EXPEDIENTE_DOCUMENTO_ORIGENES)[number];

/**
 * Extensión 1:1 de `db_expedientes` para la tipología 'subvenciones'.
 *
 * Mantiene los metadatos económicos y administrativos específicos.
 * `subestado` traza la fase concreta dentro del flujo (ver SQL para el
 * grafo completo). Las dos propuestas a la junta vinculadas (presentación
 * inicial y cierre) se referencian por `propuesta_inicial_id` y
 * `propuesta_cierre_id`.
 */
export const expedienteSubvencionTable = pgTable("db_expediente_subvencion", {
  expedienteId: integer("expediente_id").primaryKey(),
  organismo: varchar("organismo", { length: 255 }),
  convocatoriaCodigo: varchar("convocatoria_codigo", { length: 255 }),
  plazoSolicitud: date("plazo_solicitud"),
  plazoJustifIntermedia: date("plazo_justif_intermedia"),
  plazoJustifFinal: date("plazo_justif_final"),
  importeDisponible: numeric("importe_disponible", { precision: 14, scale: 2 }),
  importeSolicitado: numeric("importe_solicitado", { precision: 14, scale: 2 }),
  importeConcedido: numeric("importe_concedido", { precision: 14, scale: 2 }),
  importeJustifIntermedio: numeric("importe_justif_intermedio", { precision: 14, scale: 2 }),
  importeCobradoIntermedio: numeric("importe_cobrado_intermedio", { precision: 14, scale: 2 }),
  importeJustifFinal: numeric("importe_justif_final", { precision: 14, scale: 2 }),
  importeCobradoFinal: numeric("importe_cobrado_final", { precision: 14, scale: 2 }),
  subestado: varchar("subestado", { length: 40 }).default("preparando").notNull(),
  propuestaInicialId: integer("propuesta_inicial_id"),
  propuestaCierreId: integer("propuesta_cierre_id"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).defaultNow().notNull(),
});

export const insertExpedienteSubvencionSchema = createInsertSchema(expedienteSubvencionTable).omit({
  creadoEn: true,
  actualizadoEn: true,
});
export type InsertExpedienteSubvencion = z.infer<typeof insertExpedienteSubvencionSchema>;
export type ExpedienteSubvencion = typeof expedienteSubvencionTable.$inferSelect;

export const EXPEDIENTE_SUBVENCION_SUBESTADOS = [
  "preparando",
  "aprobada_junta",
  "solicitud_enviada",
  "resuelta_concedida",
  "resuelta_denegada",
  "en_ejecucion",
  "justif_intermedia_enviada",
  "contestada_intermedia",
  "justif_final_enviada",
  "contestada_final",
  "propuesta_cierre",
] as const;
export type ExpedienteSubvencionSubestado =
  (typeof EXPEDIENTE_SUBVENCION_SUBESTADOS)[number];
