import { TransactionRollbackError, eq } from "drizzle-orm";
import { db, pool } from "./db/index.js";
import { clientes, pedidos } from "./db/schema.js";

// 1) Rollback lanzando un error
try {
  await db.transaction(async (tx) => {
    // Dentro del callback, todo debe pasar por `tx`, no por `db`
    const [diego] = await tx
      .insert(clientes)
      .values({ email: "diego@example.com", nombre: "Diego" })
      .returning();
    if (!diego) throw new Error("No se creó Diego");
    await tx.insert(pedidos).values({ total: "9990.00", clienteId: diego.id });

    throw new Error("Falla simulada"); // provoca ROLLBACK
  });
} catch (e) {
  console.log("Transacción revertida:", (e as Error).message);
}

const existe = await db.query.clientes.findFirst({ where: eq(clientes.email, "diego@example.com") });
console.log("¿Diego existe?", existe ?? null); // null

// 2) Rollback explícito con tx.rollback()
try {
  await db.transaction(async (tx) => {
    await tx.update(clientes).set({ nombre: "Bruno Díaz" }).where(eq(clientes.email, "bruno@example.com"));
    tx.rollback(); // lanza TransactionRollbackError y deshace el UPDATE
  });
} catch (e) {
  if (e instanceof TransactionRollbackError) console.log("Rollback explícito realizado");
  else throw e;
}

const bruno = await db.query.clientes.findFirst({ where: eq(clientes.email, "bruno@example.com") });
console.log("Nombre de Bruno:", bruno?.nombre); // sigue siendo "Bruno López"

await pool.end();
