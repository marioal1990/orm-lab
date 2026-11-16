import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Cliente, Pedido } from "../src/db/schema.js";
import { toClienteDetalleResponse, toClienteResponse } from "../src/mappers/cliente.mapper.js";
import { toPedidoResponse } from "../src/mappers/pedido.mapper.js";

// Pruebas unitarias: los mappers son funciones puras, no necesitan base de datos.

const cliente: Cliente = { id: 1, email: "ana@test.cl", nombre: "Ana", telefono: null };

const pedido: Pedido = {
  id: 10,
  total: "15990.00",
  estado: "PENDIENTE",
  creadoEn: new Date(),
  clienteId: 1,
};

describe("toClienteResponse()", () => {
  it("expone solo los campos del DTO de respuesta", () => {
    assert.deepEqual(toClienteResponse(cliente), {
      id: 1,
      email: "ana@test.cl",
      nombre: "Ana",
      cantidadPedidos: 0,
    });
  });

  it("cuenta los pedidos incluidos", () => {
    assert.equal(toClienteResponse({ ...cliente, pedidos: [pedido, pedido] }).cantidadPedidos, 2);
  });
});

describe("toPedidoResponse()", () => {
  it("devuelve el total como string con dos decimales", () => {
    assert.deepEqual(toPedidoResponse(pedido), { id: 10, total: "15990.00", clienteId: 1 });
  });

  it("normaliza el total que llega sin decimales desde la API relacional", () => {
    assert.equal(toPedidoResponse({ ...pedido, total: "15990" }).total, "15990.00");
  });
});

describe("toClienteDetalleResponse()", () => {
  it("incluye teléfono y pedidos", () => {
    assert.deepEqual(toClienteDetalleResponse({ ...cliente, telefono: "+56911111111", pedidos: [pedido] }), {
      id: 1,
      email: "ana@test.cl",
      nombre: "Ana",
      cantidadPedidos: 1,
      telefono: "+56911111111",
      pedidos: [{ id: 10, total: "15990.00", clienteId: 1 }],
    });
  });
});
