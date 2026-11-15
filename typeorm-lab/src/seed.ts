import { AppDataSource } from "./data-source.js";
import { Cliente } from "./entities/Cliente.js";
import { Pedido } from "./entities/Pedido.js";

await AppDataSource.initialize();

// Limpia ambas tablas para poder ejecutar el seed las veces que quieras
await AppDataSource.query(`TRUNCATE "pedido", "cliente" RESTART IDENTITY CASCADE`);

const repoC = AppDataSource.getRepository(Cliente);
const repoP = AppDataSource.getRepository(Pedido);

const ana = await repoC.save({ email: "ana@example.com", nombre: "Ana García" });
const bruno = await repoC.save({ email: "bruno@example.com", nombre: "Bruno López" });
await repoC.save({ email: "carla@example.com", nombre: "Carla Martínez" }); // sin pedidos

await repoP.save([
  { total: "15990.00", cliente: ana },
  { total: "29990.00", cliente: bruno },
  { total: "39990.00", cliente: ana },
]);

console.log("Seed listo");
await AppDataSource.destroy();
