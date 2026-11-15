import { relations } from "drizzle-orm";
import { integer, numeric, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

// En Drizzle el modelo es código TypeScript: cada tabla es un objeto.
// Es el equivalente a las @Entity de JPA, pero sin clases ni decoradores.

export const clientes = pgTable("cliente", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  telefono: varchar("telefono", { length: 20 }), // sin notNull() => nullable
});

export const pedidos = pgTable("pedido", {
  id: serial("id").primaryKey(),
  // numeric llega como string desde el driver pg (para no perder precisión)
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  estado: varchar("estado", { length: 20 }).notNull().default("PENDIENTE"),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
  clienteId: integer("cliente_id")
    .notNull()
    .references(() => clientes.id, { onDelete: "cascade" }),
});

// Las relaciones no crean nada en la base: solo habilitan `db.query...with: { ... }`
export const clientesRelations = relations(clientes, ({ many }) => ({
  pedidos: many(pedidos),
}));

export const pedidosRelations = relations(pedidos, ({ one }) => ({
  cliente: one(clientes, { fields: [pedidos.clienteId], references: [clientes.id] }),
}));

// Tipos inferidos desde las tablas: una sola fuente de verdad
export type Cliente = typeof clientes.$inferSelect;
export type NuevoCliente = typeof clientes.$inferInsert;
export type Pedido = typeof pedidos.$inferSelect;
export type NuevoPedido = typeof pedidos.$inferInsert;
