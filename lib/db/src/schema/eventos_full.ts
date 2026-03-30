import {
  pgTable, serial, integer, varchar, text, timestamp,
  decimal, boolean, jsonb, date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Tipos de evento y estado ────────────────────────────────────────────────
// tipo:   fiesta | excursion | viaje | actividad | otro
// estado: prevista | proxima | realizada | previsto | proximo | realizado | borrador | cancelado

export const eventosFullTable = pgTable("db_eventos_full", {
  id:                     serial("id").primaryKey(),
  odooId:                 integer("odoo_id").unique(),

  // Clasificación
  tipo:                   varchar("tipo", { length: 30 }).notNull().default("excursion"),
  estado:                 varchar("estado", { length: 30 }).notNull().default("prevista"),

  // Datos básicos bilingües
  nombre:                 varchar("nombre", { length: 255 }).notNull(),
  nombreEu:               varchar("nombre_eu", { length: 255 }),
  descripcion:            text("descripcion"),
  descripcionEu:          text("descripcion_eu"),

  // Fechas
  fechaInicio:            date("fecha_inicio"),
  fechaFin:               date("fecha_fin"),
  fechaFinInscripcion:    date("fecha_fin_inscripcion"),

  // Precios
  precioInscripcion:      decimal("precio_inscripcion", { precision: 10, scale: 2 }),
  precioSuplemento:       decimal("precio_suplemento", { precision: 10, scale: 2 }),
  subactsInscripcion:     text("subacts_inscripcion"),   // ej: "1,2"
  subactsSuplemento:      text("subacts_suplemento"),    // ej: "3,4"

  // Logística
  lugar:                  varchar("lugar", { length: 500 }),
  menu:                   text("menu"),
  bus1:                   varchar("bus1", { length: 255 }),
  bus2:                   varchar("bus2", { length: 255 }),
  horaRegreso:            varchar("hora_regreso", { length: 10 }),

  // Plazas
  plazasTotal:            integer("plazas_total").default(0),
  plazasDisponibles:      integer("plazas_disponibles").default(0),

  // Foto principal
  fotoUrl:                text("foto_url"),

  // Memoria (para realizadas)
  memoriaParticipantes:   text("memoria_participantes"),
  resumen:                text("resumen"),

  // Datos flexibles adicionales (JSONB para campos específicos por tipo)
  extra:                  jsonb("extra"),

  // Metadatos
  publicado:              boolean("publicado").default(false),
  createdBy:              integer("created_by"),
  odooSyncedAt:           timestamp("odoo_synced_at"),
  createdAt:              timestamp("created_at").defaultNow(),
  updatedAt:              timestamp("updated_at").defaultNow(),
});

// ─── Subactividades ──────────────────────────────────────────────────────────

export const eventosSubactsTable = pgTable("db_eventos_subacts", {
  id:         serial("id").primaryKey(),
  eventoId:   integer("evento_id").notNull(),  // FK → db_eventos_full.id
  orden:      integer("orden").notNull().default(1),

  // Datos bilingües
  nombre:     varchar("nombre", { length: 255 }),
  nombreEu:   varchar("nombre_eu", { length: 255 }),

  // Foto principal de la subactividad
  fotoUrl:    text("foto_url"),

  // Memoria de lo realizado (solo excursiones/viajes realizadas)
  memoria:    text("memoria"),

  createdAt:  timestamp("created_at").defaultNow(),
  updatedAt:  timestamp("updated_at").defaultNow(),
});

// ─── Multimedia ──────────────────────────────────────────────────────────────
// Tabla única para todos los archivos multimedia (fotos, vídeos, PDFs)
// vinculados a un evento o a una subactividad concreta

export const eventosMediaTable = pgTable("db_eventos_media", {
  id:            serial("id").primaryKey(),
  eventoId:      integer("evento_id").notNull(),  // FK → db_eventos_full.id
  subactId:      integer("subact_id"),             // FK → db_eventos_subacts.id (nullable)

  // Tipo de archivo
  tipoMedia:     varchar("tipo_media", { length: 20 }).default("foto"),
  // foto | video | pdf | documento

  // URL del archivo (object storage o URL externa)
  url:           text("url").notNull(),

  // Metadatos del archivo
  nombreArchivo: varchar("nombre_archivo", { length: 500 }),
  mimeType:      varchar("mime_type", { length: 100 }),
  tamanoBytes:   integer("tamano_bytes"),

  // Para ordenación y descripción
  orden:         integer("orden").default(0),
  descripcion:   text("descripcion"),
  descripcionEu: text("descripcion_eu"),

  // Quién lo subió
  subidoPor:     integer("subido_por"),

  createdAt:     timestamp("created_at").defaultNow(),
});

// ─── Zod schemas e inferencia de tipos ──────────────────────────────────────

export const insertEventoFullSchema = createInsertSchema(eventosFullTable)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEventoFull = z.infer<typeof insertEventoFullSchema>;
export type EventoFull = typeof eventosFullTable.$inferSelect;

export const insertEventoSubactSchema = createInsertSchema(eventosSubactsTable)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEventoSubact = z.infer<typeof insertEventoSubactSchema>;
export type EventoSubact = typeof eventosSubactsTable.$inferSelect;

export const insertEventoMediaSchema = createInsertSchema(eventosMediaTable)
  .omit({ id: true, createdAt: true });
export type InsertEventoMedia = z.infer<typeof insertEventoMediaSchema>;
export type EventoMedia = typeof eventosMediaTable.$inferSelect;
