import { z } from "zod";
import { CrearPedidoSchema } from "./pedido.dto.js";
import type { PedidoResponseDto } from "./pedido.dto.js";

// --- Entrada ---
export const CrearClienteSchema = z.object({
  email: z.email("Email inválido"),
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(100),
  telefono: z.string().max(20).optional(),
});

export const CrearClienteConPedidosSchema = CrearClienteSchema.extend({
  pedidos: z.array(CrearPedidoSchema).min(1, "Debe tener al menos un pedido"),
});

// Los tipos se derivan del esquema: una sola fuente de verdad
export type CrearClienteDto = z.infer<typeof CrearClienteSchema>;
export type CrearClienteConPedidosDto = z.infer<typeof CrearClienteConPedidosSchema>;

// --- Salida: aquí basta un tipo, porque los datos los generas tú ---
export interface ClienteResponseDto {
  id: number;
  email: string;
  nombre: string;
  cantidadPedidos: number;
}

export interface ClienteDetalleResponseDto extends ClienteResponseDto {
  telefono: string | null;
  pedidos: PedidoResponseDto[];
}

// --- Parámetros de ruta ---
export const ParamsIdSchema = z.object({
  id: z.coerce.number().int("El id debe ser un número entero").positive("El id debe ser positivo"),
});
