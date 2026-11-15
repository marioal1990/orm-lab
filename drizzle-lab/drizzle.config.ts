import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Configuración de la CLI (drizzle-kit generate / migrate / push / studio).
// La CLI no pasa por el --env-file de tsx, por eso carga el .env con dotenv.
function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    host: env("DB_HOST"),
    port: Number(env("DB_PORT")),
    user: env("DB_USER"),
    password: env("DB_PASSWORD"),
    database: env("DB_NAME"),
    ssl: false,
  },
});
