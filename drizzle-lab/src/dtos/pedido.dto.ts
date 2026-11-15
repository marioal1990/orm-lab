import { z } from "zod";

export const CrearPedidoSchema = z.object({
  // string para no perder precisión con decimales (como BigDecimal)
  total: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Formato inválido, usa por ejemplo 15990.00")
    .refine((v) => Number(v) > 0, "El total debe ser mayor a 0"),
});

export type CrearPedidoDto = z.infer<typeof CrearPedidoSchema>;

export interface PedidoResponseDto {
  id: number;
  total: string;
  clienteId: number;
}