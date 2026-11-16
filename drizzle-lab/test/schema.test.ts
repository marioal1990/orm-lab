import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getTableConfig } from "drizzle-orm/pg-core";
import { clientes, pedidos } from "../src/db/schema.js";

// Prueba unitaria del schema: verifica la definición sin tocar la base.

describe("schema", () => {
  it("pedido.cliente_id referencia a cliente.id con borrado en cascada", () => {
    const [fk] = getTableConfig(pedidos).foreignKeys;
    assert.ok(fk);

    const referencia = fk.reference(); // ejecuta el callback de .references(() => clientes.id)
    assert.equal(referencia.foreignTable, clientes);
    assert.deepEqual(referencia.columns.map((c) => c.name), ["cliente_id"]);
    assert.deepEqual(referencia.foreignColumns.map((c) => c.name), ["id"]);
    assert.equal(fk.onDelete, "cascade");
  });

  it("el email del cliente es único", () => {
    assert.equal(clientes.email.isUnique, true);
  });
});
