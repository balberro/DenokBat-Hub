import {
  pgTable, serial, integer, varchar, text, timestamp,
  decimal, boolean, date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Fiestas ─────────────────────────────────────────────────────────────────

export const fiestasTable = pgTable("db_fiestas", {
  id:                serial("id").primaryKey(),
  nombre:            varchar("nombre", { length: 255 }).notNull(),
  nombreEu:          varchar("nombre_eu", { length: 255 }),
  descripcion:       text("descripcion"),
  descripcionEu:     text("descripcion_eu"),
  fecha:             date("fecha"),
  lugar:             varchar("lugar", { length: 500 }),
  fotoUrl:           text("foto_url"),
  programa:          text("programa"),
  memoria:           text("memoria"),
  menu:              text("menu"),
  bus1:              varchar("bus1", { length: 255 }),
  bus2:              varchar("bus2", { length: 255 }),
  horaInicio:        varchar("hora_inicio", { length: 10 }),
  horaFin:           varchar("hora_fin", { length: 10 }),
  precio:            decimal("precio", { precision: 10, scale: 2 }).default("0"),
  plazasTotal:       integer("plazas_total").default(0),
  plazasDisponibles: integer("plazas_disponibles").default(0),
  estado:            varchar("estado", { length: 30 }).default("proxima"),
  publicado:         boolean("publicado").default(false),
  createdAt:         timestamp("created_at").defaultNow(),
  updatedAt:         timestamp("updated_at").defaultNow(),
});

export const insertFiestaSchema = createInsertSchema(fiestasTable)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFiesta = z.infer<typeof insertFiestaSchema>;
export type Fiesta = typeof fiestasTable.$inferSelect;

// ─── Excursiones ──────────────────────────────────────────────────────────────

export const excursionesTable = pgTable("db_excursiones", {
  id:                    serial("id").primaryKey(),
  nombre:                varchar("nombre", { length: 255 }).notNull(),
  nombreEu:              varchar("nombre_eu", { length: 255 }),
  descripcion:           text("descripcion"),
  descripcionEu:         text("descripcion_eu"),
  destino:               varchar("destino", { length: 255 }),
  fecha:                 date("fecha"),
  fechaRegreso:          date("fecha_regreso"),
  fotoUrl:               text("foto_url"),
  precioInscripcion:     decimal("precio_inscripcion", { precision: 10, scale: 2 }),
  precioSuplemento:      decimal("precio_suplemento", { precision: 10, scale: 2 }),
  subactsInscripcion:    text("subacts_inscripcion"),
  subactsSuplemento:     text("subacts_suplemento"),
  fechaFinInscripcion:   date("fecha_fin_inscripcion"),
  menu:                  text("menu"),
  bus1:                  varchar("bus1", { length: 255 }),
  bus2:                  varchar("bus2", { length: 255 }),
  horaRegreso:           varchar("hora_regreso", { length: 10 }),
  plazasTotal:           integer("plazas_total").default(0),
  plazasDisponibles:     integer("plazas_disponibles").default(0),
  estado:                varchar("estado", { length: 30 }).default("prevista"),
  observaciones:         text("observaciones"),
  memoriaParticipantes:  text("memoria_participantes"),
  resumen:               text("resumen"),
  publicado:             boolean("publicado").default(false),
  createdAt:             timestamp("created_at").defaultNow(),
  updatedAt:             timestamp("updated_at").defaultNow(),
});

export const insertExcursionSchema = createInsertSchema(excursionesTable)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertExcursion = z.infer<typeof insertExcursionSchema>;
export type Excursion = typeof excursionesTable.$inferSelect;

// ─── Excursiones — Subactividades ─────────────────────────────────────────────

export const excursionesSubactsTable = pgTable("db_excursiones_subacts", {
  id:           serial("id").primaryKey(),
  excursionId:  integer("excursion_id").notNull(),
  orden:        integer("orden").notNull().default(1),
  nombre:       varchar("nombre", { length: 255 }),
  nombreEu:     varchar("nombre_eu", { length: 255 }),
  fotoUrl:      text("foto_url"),
  memoria:      text("memoria"),
  createdAt:    timestamp("created_at").defaultNow(),
  updatedAt:    timestamp("updated_at").defaultNow(),
});

export const insertExcursionSubactSchema = createInsertSchema(excursionesSubactsTable)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertExcursionSubact = z.infer<typeof insertExcursionSubactSchema>;
export type ExcursionSubact = typeof excursionesSubactsTable.$inferSelect;

// ─── Viajes ──────────────────────────────────────────────────────────────────

export const viajesTable = pgTable("db_viajes", {
  id:                    serial("id").primaryKey(),
  nombre:                varchar("nombre", { length: 255 }).notNull(),
  nombreEu:              varchar("nombre_eu", { length: 255 }),
  descripcion:           text("descripcion"),
  descripcionEu:         text("descripcion_eu"),
  destinos:              text("destinos"),
  fechaInicio:           date("fecha_inicio"),
  fechaFin:              date("fecha_fin"),
  fotoUrl:               text("foto_url"),
  alojamiento:           text("alojamiento"),
  itinerario:            text("itinerario"),
  precioInscripcion:     decimal("precio_inscripcion", { precision: 10, scale: 2 }),
  precioSuplemento:      decimal("precio_suplemento", { precision: 10, scale: 2 }),
  fechaFinInscripcion:   date("fecha_fin_inscripcion"),
  bus1:                  varchar("bus1", { length: 255 }),
  bus2:                  varchar("bus2", { length: 255 }),
  plazasTotal:           integer("plazas_total").default(0),
  plazasDisponibles:     integer("plazas_disponibles").default(0),
  estado:                varchar("estado", { length: 30 }).default("previsto"),
  observaciones:         text("observaciones"),
  memoriaParticipantes:  text("memoria_participantes"),
  resumen:               text("resumen"),
  publicado:             boolean("publicado").default(false),
  createdAt:             timestamp("created_at").defaultNow(),
  updatedAt:             timestamp("updated_at").defaultNow(),
});

export const insertViajeSchema = createInsertSchema(viajesTable)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertViaje = z.infer<typeof insertViajeSchema>;
export type Viaje = typeof viajesTable.$inferSelect;

// ─── Viajes — Días / Etapas ───────────────────────────────────────────────────

export const viajesDiasTable = pgTable("db_viajes_dias", {
  id:          serial("id").primaryKey(),
  viajeId:     integer("viaje_id").notNull(),
  dia:         integer("dia").notNull().default(1),
  titulo:      varchar("titulo", { length: 255 }),
  tituloEu:    varchar("titulo_eu", { length: 255 }),
  descripcion: text("descripcion"),
  fotoUrl:     text("foto_url"),
  memoria:     text("memoria"),
  createdAt:   timestamp("created_at").defaultNow(),
  updatedAt:   timestamp("updated_at").defaultNow(),
});

export const insertViajeDiaSchema = createInsertSchema(viajesDiasTable)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertViajeDia = z.infer<typeof insertViajeDiaSchema>;
export type ViajeDia = typeof viajesDiasTable.$inferSelect;

// ─── Multimedia compartida ────────────────────────────────────────────────────
// tipo_evento: 'fiesta' | 'excursion' | 'viaje'
// subitem_id: referencias a subact (excursion) o dia (viaje)

export const eventosFotosTable = pgTable("db_eventos_fotos", {
  id:            serial("id").primaryKey(),
  tipoEvento:    varchar("tipo_evento", { length: 20 }).notNull(),
  eventoId:      integer("evento_id").notNull(),
  subitemId:     integer("subitem_id"),
  tipoMedia:     varchar("tipo_media", { length: 20 }).default("foto"),
  url:           text("url").notNull(),
  nombreArchivo: varchar("nombre_archivo", { length: 500 }),
  mimeType:      varchar("mime_type", { length: 100 }),
  orden:         integer("orden").default(0),
  descripcion:   text("descripcion"),
  createdAt:     timestamp("created_at").defaultNow(),
});

export const insertEventoFotoSchema = createInsertSchema(eventosFotosTable)
  .omit({ id: true, createdAt: true });
export type InsertEventoFoto = z.infer<typeof insertEventoFotoSchema>;
export type EventoFoto = typeof eventosFotosTable.$inferSelect;

// ─── Pulunpes ────────────────────────────────────────────────────────────────

export const pulunpesTable = pgTable("db_pulunpe", {
  id:          serial("id").primaryKey(),
  titulo:      varchar("titulo", { length: 255 }).notNull(),
  tituloEu:    varchar("titulo_eu", { length: 255 }),
  anio:        integer("anio"),
  mes:         integer("mes"),
  descripcion: text("descripcion"),
  descripcionEu: text("descripcion_eu"),
  fotoUrl:     text("foto_url"),
  pdfUrl:      text("pdf_url"),
  estado:      varchar("estado", { length: 20 }).default("borrador"),
  createdAt:   timestamp("created_at").defaultNow(),
  updatedAt:   timestamp("updated_at").defaultNow(),
});

export const insertPulunpeSchema = createInsertSchema(pulunpesTable)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPulunpe = z.infer<typeof insertPulunpeSchema>;
export type Pulunpe = typeof pulunpesTable.$inferSelect;

// ─── Hojas informativas ───────────────────────────────────────────────────────

export const hojasTable = pgTable("db_hojas_informativas", {
  id:            serial("id").primaryKey(),
  titulo:        varchar("titulo", { length: 255 }).notNull(),
  tituloEu:      varchar("titulo_eu", { length: 255 }),
  anio:          integer("anio"),
  mes:           integer("mes"),
  descripcion:   text("descripcion"),
  descripcionEu: text("descripcion_eu"),
  fotoUrl:       text("foto_url"),
  pdfUrl:        text("pdf_url"),
  estado:        varchar("estado", { length: 20 }).default("borrador"),
  createdAt:     timestamp("created_at").defaultNow(),
  updatedAt:     timestamp("updated_at").defaultNow(),
});

export const insertHojaSchema = createInsertSchema(hojasTable)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertHoja = z.infer<typeof insertHojaSchema>;
export type Hoja = typeof hojasTable.$inferSelect;

// ─── Noticias ────────────────────────────────────────────────────────────────

export const noticiasTable = pgTable("db_noticias", {
  id:            serial("id").primaryKey(),
  titulo:        varchar("titulo", { length: 255 }).notNull(),
  tituloEu:      varchar("titulo_eu", { length: 255 }),
  categoria:     varchar("categoria", { length: 100 }).default("General"),
  fecha:         date("fecha").notNull(),
  resumen:       text("resumen"),
  resumenEu:     text("resumen_eu"),
  contenido:     text("contenido").notNull(),
  contenidoEu:   text("contenido_eu"),
  imagenesJson:  text("imagenes_json"),
  publicado:     boolean("publicado").default(true),
  createdAt:     timestamp("created_at").defaultNow(),
  updatedAt:     timestamp("updated_at").defaultNow(),
});

export const insertNoticiaSchema = createInsertSchema(noticiasTable)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertNoticia = z.infer<typeof insertNoticiaSchema>;
export type Noticia = typeof noticiasTable.$inferSelect;

// ─── Articulos ───────────────────────────────────────────────────────────────

export const articulosTable = pgTable("db_articulos", {
  id:            serial("id").primaryKey(),
  titulo:        varchar("titulo", { length: 255 }).notNull(),
  tituloEu:      varchar("titulo_eu", { length: 255 }),
  categoria:     varchar("categoria", { length: 100 }).default("General"),
  fecha:         date("fecha").notNull(),
  resumen:       text("resumen"),
  resumenEu:     text("resumen_eu"),
  contenido:     text("contenido").notNull(),
  contenidoEu:   text("contenido_eu"),
  imagenesJson:  text("imagenes_json"),
  publicado:     boolean("publicado").default(true),
  createdAt:     timestamp("created_at").defaultNow(),
  updatedAt:     timestamp("updated_at").defaultNow(),
});

export const insertArticuloSchema = createInsertSchema(articulosTable)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertArticulo = z.infer<typeof insertArticuloSchema>;
export type Articulo = typeof articulosTable.$inferSelect;

// ─── Galeria ─────────────────────────────────────────────────────────────────

export const galeriaTable = pgTable("db_galeria", {
  id:          serial("id").primaryKey(),
  titulo:      varchar("titulo", { length: 255 }).notNull(),
  tituloEu:    varchar("titulo_eu", { length: 255 }),
  fecha:       date("fecha").notNull(),
  tema:        varchar("tema", { length: 50 }).default("Evento"),
  mediaUrl:    text("media_url").notNull(),
  thumbUrl:    text("thumb_url"),
  tipoMedia:   varchar("tipo_media", { length: 20 }).default("foto"),
  publicado:   boolean("publicado").default(true),
  createdAt:   timestamp("created_at").defaultNow(),
  updatedAt:   timestamp("updated_at").defaultNow(),
});

export const insertGaleriaSchema = createInsertSchema(galeriaTable)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGaleria = z.infer<typeof insertGaleriaSchema>;
export type Galeria = typeof galeriaTable.$inferSelect;
