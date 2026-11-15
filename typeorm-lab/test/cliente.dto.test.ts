import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ZodType } from "zod";
import { CrearClienteConPedidosSchema, CrearClienteSchema } from "../src/dtos/cliente.dto.js";

// Pruebas unitarias puras: no tocan la base de datos.

/**
 * Devuelve los campos que fallaron la validación, p. ej. ["email", "pedidos.0.total"].
 * Un mismo campo puede fallar varias reglas (regex y refine), por eso se eliminan duplicados.
 */
function camposConError(data: unknown, schema: ZodType = CrearClienteConPedidosSchema): string[] {
  const r = schema.safeParse(data);
  return r.success ? [] : [...new Set(r.error.issues.map((i) => i.path.join(".")))];
}

const valido = { email: "ana@test.cl", nombre: "Ana", pedidos: [{ total: "15990.00" }] };

describe("CrearClienteSchema", () => {
  it("acepta un cliente válido y recorta espacios del nombre", () => {
    const r = CrearClienteSchema.safeParse({ email: "ana@test.cl", nombre: "  Ana  " });
    assert.ok(r.success);
    assert.equal(r.data.nombre, "Ana");
  });

  it("rechaza un email inválido", () => {
    assert.deepEqual(camposConError({ email: "no-es-email", nombre: "Ana" }, CrearClienteSchema), ["email"]);
  });

  it("rechaza un nombre demasiado corto", () => {
    assert.deepEqual(camposConError({ email: "ana@test.cl", nombre: "A" }, CrearClienteSchema), ["nombre"]);
  });
});

describe("CrearClienteConPedidosSchema", () => {
  it("acepta datos válidos", () => {
    assert.deepEqual(camposConError(valido), []);
  });

  it("exige al menos un pedido", () => {
    assert.deepEqual(camposConError({ ...valido, pedidos: [] }), ["pedidos"]);
  });

  for (const total of ["-5", "0", "10.999", "abc"]) {
    it(`rechaza el total "${total}"`, () => {
      assert.deepEqual(camposConError({ ...valido, pedidos: [{ total }] }), ["pedidos.0.total"]);
    });
  }

  it("informa todos los errores a la vez", () => {
    assert.deepEqual(
      camposConError({ email: "x", nombre: "A", pedidos: [{ total: "-1" }] }).sort(),
      ["email", "nombre", "pedidos.0.total"]
    );
  });
});
