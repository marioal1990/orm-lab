import { asc, count, desc, eq, gt, ilike, sql } from "drizzle-orm";
import { db, pool } from "./db/index.js";
import { clientes, pedidos } from "./db/schema.js";

// Drizzle ofrece dos APIs:
//  - API SQL (db.select()...): se escribe casi como SQL. Equivale a jOOQ.
//  - API relacional (db.query...): objetos anidados, parecida a Prisma.

// A) API SQL: filtro + orden
const conA = await db
  .select()
  .from(clientes)
  .where(ilike(clientes.nombre, "%a%"))
  .orderBy(asc(clientes.nombre));
console.log("A) Clientes con 'a':", conA);

// B) API relacional: buscar uno (undefined si no existe)
const ana = await db.query.clientes.findFirst({ where: eq(clientes.email, "ana@example.com") });
console.log("B) Ana:", ana);

// C) API relacional: pedidos > 10.000 con su cliente
const grandes = await db.query.pedidos.findMany({
  where: gt(pedidos.total, "10000"),
  with: { cliente: true },
});
console.log("C) Pedidos grandes:", grandes);

// D) API SQL: join explícito, el resultado viene separado por tabla
const conPedidos = await db
  .select({ cliente: clientes.nombre, pedidoId: pedidos.id, total: pedidos.total })
  .from(clientes)
  .innerJoin(pedidos, eq(pedidos.clienteId, clientes.id))
  .where(gt(pedidos.total, "5000"))
  .orderBy(asc(clientes.nombre));
console.log("D) Clientes con pedidos > 5.000:", conPedidos);

// E) Agregación: total y cantidad de pedidos por cliente
const total = sql<string>`coalesce(sum(${pedidos.total}), 0)`;
const totales = await db
  .select({ nombre: clientes.nombre, cantidad: count(pedidos.id), total })
  .from(clientes)
  .leftJoin(pedidos, eq(pedidos.clienteId, clientes.id))
  .groupBy(clientes.id)
  .orderBy(desc(total));
console.table(totales);

// F) Ver el SQL sin ejecutarlo
console.log("F)", db.select().from(clientes).where(eq(clientes.id, 1)).toSQL());

await pool.end();
