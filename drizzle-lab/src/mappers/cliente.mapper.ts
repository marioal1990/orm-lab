import type { Cliente, Pedido } from "../db/schema.js";
import type { ClienteDetalleResponseDto, ClienteResponseDto } from "../dtos/cliente.dto.js";
import { toPedidoResponse } from "./pedido.mapper.js";

export function toClienteResponse(cliente: Cliente & { pedidos?: Pedido[] }): ClienteResponseDto {
  return {
    id: cliente.id,
    email: cliente.email,
    nombre: cliente.nombre,
    cantidadPedidos: cliente.pedidos?.length ?? 0,
  };
}

/** Respuesta de GET /clientes/:id: incluye teléfono y pedidos. */
export function toClienteDetalleResponse(cliente: Cliente & { pedidos: Pedido[] }): ClienteDetalleResponseDto {
  return {
    ...toClienteResponse(cliente),
    telefono: cliente.telefono,
    pedidos: cliente.pedidos.map(toPedidoResponse),
  };
}
