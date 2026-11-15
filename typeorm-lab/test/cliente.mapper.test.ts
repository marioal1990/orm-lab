import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Cliente } from "../src/entities/Cliente.js";
import type { Pedido } from "../src/entities/Pedido.js";
import { toClienteResponse } from "../src/mappers/cliente.mapper.js";

// Prueba unitaria: el mapper es una función pura, no necesita base de datos.

const base: Cliente = { id: 1, email: "ana@test.cl", nombre: "Ana", telefono: null, pedidos: [] };

describe("toClienteResponse()", () => {
  it("expone solo los campos del DTO de respuesta", () => {
    assert.deepEqual(toClienteResponse(base), {
      id: 1,
      email: "ana@test.cl",
      nombre: "Ana",
      cantidadPedidos: 0,
    });
  });

  it("cuenta los pedidos cargados", () => {
    const conPedidos: Cliente = { ...base, pedidos: [{} as Pedido, {} as Pedido] };
    assert.equal(toClienteResponse(conPedidos).cantidadPedidos, 2);
  });
});
