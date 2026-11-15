import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";
import { config } from "./config.js";

const adapter = new PrismaPg({ connectionString: config.db.url });

export const prisma = new PrismaClient({
  adapter,
  // DB_LOGGING=false (en .env.test) apaga el log de SQL durante las pruebas
  log: process.env.DB_LOGGING === "false" ? [] : ["query"],
});
