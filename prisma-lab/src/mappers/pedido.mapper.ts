import type { Pedido } from "../generated/prisma/client.js";
import type { PedidoResponseDto } from "../dtos/pedido.dto.js";

export function toPedidoResponse(pedido: Pedido): PedidoResponseDto {
  return {
    id: pedido.id,
    // total es un Prisma.Decimal: toFixed(2) lo deja como "15990.00"
    total: pedido.total.toFixed(2),
    clienteId: pedido.clienteId,
  };
}
