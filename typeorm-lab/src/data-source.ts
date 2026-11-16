import "reflect-metadata";
import { DataSource } from "typeorm";
import { config } from "./config.js";
import { Cliente } from "./entities/Cliente.js";
import { Pedido } from "./entities/Pedido.js";
import { patronMigraciones } from "./utils/migraciones.js";

export const AppDataSource = new DataSource({
  type: "postgres",
  ...config.db,
  entities: [Cliente, Pedido],
  migrations: [patronMigraciones(import.meta.filename)],
  synchronize: false,
  logging: process.env.DB_LOGGING !== "false",
});
