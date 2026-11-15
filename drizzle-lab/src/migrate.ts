import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./db/index.js";

// Aplica las migraciones de ./drizzle desde código, sin drizzle-kit.
// Se usa en producción (npm run migrate:prod) y en las pruebas.
await migrate(db, { migrationsFolder: "drizzle" });
console.log("Migraciones aplicadas");
await pool.end();
