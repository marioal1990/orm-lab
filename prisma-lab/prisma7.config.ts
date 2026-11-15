import "dotenv/config";
import { defineConfig } from "prisma/config";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

const user = encodeURIComponent(env("DB_USER"));
const password = encodeURIComponent(env("DB_PASSWORD"));

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: `postgresql://${user}:${password}@${env("DB_HOST")}:${env("DB_PORT")}/${env("DB_NAME")}`,
  },
});