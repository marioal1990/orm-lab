import type { Cliente, Pedido, Prisma, PrismaClient } from "../generated/prisma/client.js";
import type { CrearClienteConPedidosDto, CrearClienteDto } from "../dtos/cliente.dto.js";

export interface TotalCliente {
  nombre: string;
  cantidad: number;
  total: number;
}

export type ClienteConPedidos = Cliente & { pedidos: Pedido[] };

/**
 * Lógica de negocio de clientes (equivalente a un @Service de Spring).
 * Recibe DTOs ya validados con Zod; la validación ocurre en la frontera.
 */
export class ClienteService {
  constructor(private readonly prisma: PrismaClient) {}

  crear(dto: CrearClienteDto): Promise<Cliente> {
    return this.prisma.cliente.create({
      data: { email: dto.email, nombre: dto.nombre, telefono: dto.telefono ?? null },
    });
  }

  buscarPorEmail(email: string): Promise<ClienteConPedidos | null> {
    return this.prisma.cliente.findUnique({ where: { email }, include: { pedidos: true } });
  }

  /**
   * Crea el cliente y sus pedidos con un "nested write".
   * Prisma lo ejecuta en una transacción: si un pedido falla, no se guarda nada.
   */
  crearConPedidos(dto: CrearClienteConPedidosDto): Promise<ClienteConPedidos> {
    return this.prisma.cliente.create({
      data: {
        email: dto.email,
        nombre: dto.nombre,
        telefono: dto.telefono ?? null,
        pedidos: { create: dto.pedidos.map((p) => ({ total: p.total })) },
      },
      include: { pedidos: true },
    });
  }

  async totalesPorCliente(): Promise<TotalCliente[]> {
    const filas = await this.prisma.$queryRaw<
      { nombre: string; cantidad: bigint; total: Prisma.Decimal }[]
    >`
      SELECT c.nombre, COUNT(p.id) AS cantidad, COALESCE(SUM(p.total), 0) AS total
      FROM cliente c
      LEFT JOIN pedido p ON p.cliente_id = c.id
      GROUP BY c.id
      ORDER BY total DESC, c.nombre ASC
    `;
    return filas.map((f) => ({
      nombre: f.nombre,
      cantidad: Number(f.cantidad),
      total: f.total.toNumber(),
    }));
  }

  sinPedidos(): Promise<Cliente[]> {
    return this.prisma.cliente.findMany({
      where: { pedidos: { none: {} } },
      orderBy: { nombre: "asc" },
    });
  }
}
