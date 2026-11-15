import type { Pedido } from "../db/schema.js";
import type { PedidoResponseDto } from "../dtos/pedido.dto.js";

export function toPedidoResponse(pedido: Pedido): PedidoResponseDto {
  return {
    id: pedido.id,
    // numeric llega como string, pero su formato depende de la API usada:
    // la API SQL devuelve "15990.00" y la relacional (db.query, que usa JSON) "15990".
    // Se normaliza a 2 decimales; numeric(10,2) cabe sin pérdida en un number.
    total: Number(pedido.total).toFixed(2),
    clienteId: pedido.clienteId,
  };
}
