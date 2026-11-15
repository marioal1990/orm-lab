import { env } from "./utils/env.js";

/**
 * Configuración de la aplicación, leída desde variables de entorno.
 * Si falta alguna variable, la app falla al arrancar con un mensaje claro.
 */
export const config = {
  db: {
    host: env("DB_HOST"),
    port: Number(env("DB_PORT")),
    username: env("DB_USER"),
    password: env("DB_PASSWORD"),
    database: env("DB_NAME"),
  },
};
