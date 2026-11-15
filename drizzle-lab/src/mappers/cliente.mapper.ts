import type { Cliente, Pedido } from "../db/schema.js";
import type { ClienteResponseDto } from "../dtos/cliente.dto.js";

export function toClienteResponse(cliente: Cliente & { pedidos?: Pedido[] }): ClienteResponseDto {
  return {
    id: cliente.id,
    email: cliente.email,
    nombre: cliente.nombre,
    cantidadPedidos: cliente.pedidos?.length ?? 0,
  };
}
