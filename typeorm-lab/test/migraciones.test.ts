import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { AppDataSource } from "../src/data-source.js";
import { patronMigraciones } from "../src/utils/migraciones.js";

describe("patronMigraciones()", () => {
  it("usa las migraciones .ts cuando corre con tsx", () => {
    assert.equal(patronMigraciones("/app/src/data-source.ts"), path.join("/app/src", "migrations", "*.ts"));
  });

  it("usa las migraciones .js cuando corre compilado", () => {
    assert.equal(patronMigraciones("/app/dist/data-source.js"), path.join("/app/dist", "migrations", "*.js"));
  });
});

// Prueba de integración: cada migración debe poder revertirse (down) y volver a aplicarse (up).
describe("Migraciones (TypeORM)", () => {
  before(async () => {
    await AppDataSource.initialize();
    await AppDataSource.runMigrations();
  });

  after(async () => {
    await AppDataSource.runMigrations(); // deja la base como estaba
    await AppDataSource.destroy();
  });

  it("se pueden revertir y volver a aplicar", async () => {
    const qr = AppDataSource.createQueryRunner();
    try {
      await AppDataSource.undoLastMigration(); // AddTelefono.down()
      assert.equal(await qr.hasColumn("cliente", "telefono"), false);

      await AppDataSource.undoLastMigration(); // Init.down()
      assert.equal(await qr.hasTable("cliente"), false);
      assert.equal(await qr.hasTable("pedido"), false);

      await AppDataSource.runMigrations(); // up() de ambas
      assert.equal(await qr.hasColumn("cliente", "telefono"), true);
    } finally {
      await qr.release();
    }
  });
});
