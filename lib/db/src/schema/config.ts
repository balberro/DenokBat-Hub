import { pgTable, serial, integer, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const configTable = pgTable("db_config", {
  clave: varchar("clave", { length: 100 }).primaryKey(),
  valor: text("valor"),
  descripcion: text("descripcion"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const syncLogTable = pgTable("db_sync_log", {
  id: serial("id").primaryKey(),
  modelo: varchar("modelo", { length: 100 }).notNull(),
  operacion: varchar("operacion", { length: 50 }).notNull(),
  registrosProcesados: integer("registros_procesados").default(0),
  errores: integer("errores").default(0),
  mensaje: text("mensaje"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertConfigSchema = createInsertSchema(configTable);
export type InsertConfig = z.infer<typeof insertConfigSchema>;
export type Config = typeof configTable.$inferSelect;
