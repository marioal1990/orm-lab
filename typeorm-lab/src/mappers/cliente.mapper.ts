import type { Cliente } from "../entities/Cliente.js";
import type { ClienteDetalleResponseDto, ClienteResponseDto } from "../dtos/cliente.dto.js";
import { toPedidoResponse } from "./pedido.mapper.js";

export function toClienteResponse(cliente: Cliente): ClienteResponseDto {
  return {
    id: cliente.id,
    email: cliente.email,
    nombre: cliente.nombre,
    cantidadPedidos: cliente.pedidos?.length ?? 0,
  };
}

/** Respuesta de GET /clientes/:id: incluye teléfono y pedidos. */
export function toClienteDetalleResponse(cliente: Cliente): ClienteDetalleResponseDto {
  return {
    ...toClienteResponse(cliente),
    telefono: cliente.telefono,
    pedidos: (cliente.pedidos ?? []).map((p) => toPedidoResponse(p, cliente.id)),
  };
}
