import { pgTable, serial, integer, varchar, text, char, date, timestamp, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sociosTable = pgTable("db_socios", {
  id: serial("id").primaryKey(),
  odooId: integer("odoo_id").unique(),
  usuarioId: integer("usuario_id"),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  apellidos: varchar("apellidos", { length: 255 }),
  email: varchar("email", { length: 255 }),
  telefono: varchar("telefono", { length: 50 }),
  direccion: text("direccion"),
  poblacion: varchar("poblacion", { length: 255 }),
  provincia: varchar("provincia", { length: 255 }),
  dni: varchar("dni", { length: 20 }),
  fechaNacimiento: date("fecha_nacimiento"),
  fechaFallecimiento: date("fecha_fallecimiento"),
  fechaAlta: date("fecha_alta"),
  numeroSocio: varchar("numero_socio", { length: 50 }),
  genero: char("genero", { length: 1 }),
  estado: varchar("estado", { length: 30 }).default("solicitante"),
  tipoSocio: varchar("tipo_socio", { length: 30 }).default("ordinario"),
  tipologia: varchar("tipologia", { length: 30 }).default("numeraria"),
  membershipEstado: varchar("membership_estado", { length: 50 }),
  membershipDesde: date("membership_desde"),
  membershipHasta: date("membership_hasta"),
  membershipCuota: decimal("membership_cuota", { precision: 10, scale: 2 }),
  grupoId: integer("grupo_id"),
  /** Asignación manual del rol contable; si true, los recálculos automáticos no la tocan. */
  grupoManual: boolean("grupo_manual").notNull().default(false),
  avatarUrl: text("avatar_url"),
  dniDocAnversoUrl: text("dni_doc_anverso_url"),
  dniDocReversoUrl: text("dni_doc_reverso_url"),
  solicitudMetodoPago: varchar("solicitud_metodo_pago", { length: 50 }),
  solicitudCuotaImporte: decimal("solicitud_cuota_importe", { precision: 10, scale: 2 }),
  solicitudRevisionCampos: text("solicitud_revision_campos"),
  solicitudRevisionMensaje: text("solicitud_revision_mensaje"),
  solicitudDatosExtraJson: text("solicitud_datos_extra_json"),
  odooSyncedAt: timestamp("odoo_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSocioSchema = createInsertSchema(sociosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSocio = z.infer<typeof insertSocioSchema>;
export type Socio = typeof sociosTable.$inferSelect;
