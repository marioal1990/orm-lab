import { DrizzleQueryError } from "drizzle-orm";
import { DatabaseError } from "pg";
import { db, pool } from "./db/index.js";
import { clientes } from "./db/schema.js";

try {
  await db.insert(clientes).values({ email: "ana@example.com", nombre: "Otra Ana" });
} catch (e) {
  // Drizzle envuelve el error del driver; el original queda en `cause`
  const causa = e instanceof DrizzleQueryError ? e.cause : e;

  // 23505 = unique_violation (código estándar de PostgreSQL)
  if (causa instanceof DatabaseError && causa.code === "23505") {
    console.log("Email duplicado:", causa.detail);
  } else throw e;
} finally {
  await pool.end();
}
