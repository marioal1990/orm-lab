import { sql } from "drizzle-orm";
import { db, pool } from "./db/index.js";
import { clientes, pedidos } from "./db/schema.js";

// Limpia ambas tablas para poder ejecutar el seed las veces que quieras
await db.execute(sql`TRUNCATE "pedido", "cliente" RESTART IDENTITY CASCADE`);

const [ana, bruno] = await db
  .insert(clientes)
  .values([
    { email: "ana@example.com", nombre: "Ana García" },
    { email: "bruno@example.com", nombre: "Bruno López" },
    { email: "carla@example.com", nombre: "Carla Martínez" }, // sin pedidos
  ])
  .returning({ id: clientes.id });
if (!ana || !bruno) throw new Error("No se insertaron los clientes");

await db.insert(pedidos).values([
  { total: "15990.00", clienteId: ana.id },
  { total: "4990.00", clienteId: ana.id },
  { total: "32500.00", clienteId: bruno.id },
]);

console.log("Seed listo");
await pool.end();
