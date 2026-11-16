import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Cliente } from "../src/entities/Cliente.js";
import type { Pedido } from "../src/entities/Pedido.js";
import { toClienteDetalleResponse, toClienteResponse } from "../src/mappers/cliente.mapper.js";

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

describe("toClienteDetalleResponse()", () => {
  it("incluye teléfono y pedidos con el total a dos decimales", () => {
    const pedido = { id: 5, total: "4990" } as Pedido;
    assert.deepEqual(toClienteDetalleResponse({ ...base, telefono: "+56911111111", pedidos: [pedido] }), {
      id: 1,
      email: "ana@test.cl",
      nombre: "Ana",
      cantidadPedidos: 1,
      telefono: "+56911111111",
      pedidos: [{ id: 5, total: "4990.00", clienteId: 1 }],
    });
  });

  it("devuelve una lista vacía si los pedidos no se cargaron", () => {
    // Por ejemplo, el cliente que devuelve `crear()`: TypeORM no carga la relación
    const sinRelacion = { ...base, pedidos: undefined } as unknown as Cliente;
    assert.deepEqual(toClienteDetalleResponse(sinRelacion).pedidos, []);
  });
});
