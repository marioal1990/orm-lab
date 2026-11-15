import { env } from "./utils/env.js";

const user = encodeURIComponent(env("DB_USER"));
const password = encodeURIComponent(env("DB_PASSWORD"));

export const config = {
  db: {
    url: `postgresql://${user}:${password}@${env("DB_HOST")}:${env("DB_PORT")}/${env("DB_NAME")}?schema=public`,
  },
};