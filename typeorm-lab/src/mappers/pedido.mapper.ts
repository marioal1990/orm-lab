import type { Pedido } from "../entities/Pedido.js";
import type { PedidoResponseDto } from "../dtos/pedido.dto.js";

/**
 * En TypeORM la entidad Pedido no tiene un campo clienteId (solo la relación `cliente`),
 * y al cargar los pedidos desde el cliente esa relación no viene. Por eso se recibe aparte.
 */
export function toPedidoResponse(pedido: Pedido, clienteId: number): PedidoResponseDto {
  return {
    id: pedido.id,
    total: Number(pedido.total).toFixed(2), // numeric llega como string
    clienteId,
  };
}
