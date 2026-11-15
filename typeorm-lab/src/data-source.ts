import "reflect-metadata";
import { DataSource } from "typeorm";
import { config } from "./config.js";
import { Cliente } from "./entities/Cliente.js";
import { Pedido } from "./entities/Pedido.js";

// Con tsx (desarrollo) este archivo es .ts y se cargan las migraciones .ts de src/;
// después de `npm run build` es .js y se cargan las migraciones compiladas de dist/.
const ext = import.meta.filename.endsWith(".ts") ? "ts" : "js";

export const AppDataSource = new DataSource({
  type: "postgres",
  ...config.db,
  entities: [Cliente, Pedido],
  migrations: [`${import.meta.dirname}/migrations/*.${ext}`],
  synchronize: false,
  logging: process.env.DB_LOGGING !== "false",
});
