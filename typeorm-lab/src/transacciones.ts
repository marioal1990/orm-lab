import { AppDataSource } from "./data-source.js";
import { Cliente } from "./entities/Cliente.js";
import { Pedido } from "./entities/Pedido.js";

await AppDataSource.initialize();

try {
  await AppDataSource.transaction(async (manager) => {
    // Dentro de la transacción, todo debe pasar por `manager`
    const diego = await manager.getRepository(Cliente).save({ email: "diego@example.com", nombre: "Diego" });
    await manager.getRepository(Pedido).save({ total: "15990.00", cliente: diego });

    throw new Error("Falla simulada"); // provoca ROLLBACK
  });
} catch (e) {
  console.log("Transacción fallida, se hizo rollback:", (e as Error).message);
}

const existe = await AppDataSource.getRepository(Cliente).findOneBy({ email: "diego@example.com" });
console.log("¿Diego existe?", existe); // null

await AppDataSource.destroy();
