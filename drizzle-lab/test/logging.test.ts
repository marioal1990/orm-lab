import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

// Prueba de integración: DB_LOGGING controla si se muestra el SQL ejecutado.
// Como la conexión se configura al importar el módulo, cada caso corre en un proceso aparte.

const script = [
  "import { sql } from \"drizzle-orm\";",
  "import { db, pool } from \"./src/db/index.ts\";",
  "await db.execute(sql`SELECT 1 AS uno`);",
  "await pool.end();",
].join("\n");

function ejecutarConLogging(valor: string): string {
  return execFileSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script], {
    env: { ...process.env, DB_LOGGING: valor },
    encoding: "utf8",
  });
}

describe("DB_LOGGING (Drizzle)", () => {
  it("muestra el SQL cuando no es false", () => {
    assert.match(ejecutarConLogging("true"), /SELECT 1 AS uno/);
  });

  it("no muestra el SQL cuando es false", () => {
    assert.doesNotMatch(ejecutarConLogging("false"), /SELECT 1 AS uno/);
  });
});
