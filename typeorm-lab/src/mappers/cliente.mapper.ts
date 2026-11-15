import type { Cliente } from "../entities/Cliente.js";
import type { ClienteResponseDto } from "../dtos/cliente.dto.js";

export function toClienteResponse(cliente: Cliente): ClienteResponseDto {
  return {
    id: cliente.id,
    email: cliente.email,
    nombre: cliente.nombre,
    cantidadPedidos: cliente.pedidos?.length ?? 0,
  };
}