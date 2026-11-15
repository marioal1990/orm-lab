import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "../config.js";
import * as schema from "./schema.js";

// Pool de conexiones del driver pg (como un DataSource/HikariCP en Java)
export const pool = new Pool(config.db);

export const db = drizzle({
  client: pool,
  schema, // necesario para la API relacional: db.query.clientes.findMany(...)
  logger: process.env.DB_LOGGING !== "false", // DB_LOGGING=false apaga el log de SQL
});

export type DB = typeof db;
