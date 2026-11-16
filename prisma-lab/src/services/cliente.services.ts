import { Prisma } from "../generated/prisma/client.js";
import type { Cliente, Pedido, PrismaClient } from "../generated/prisma/client.js";
import type { CrearClienteConPedidosDto, CrearClienteDto } from "../dtos/cliente.dto.js";
import { ConflictoError } from "../errors.js";

export interface TotalCliente {
  nombre: string;
  cantidad: number;
  total: number;
}

export type ClienteConPedidos = Cliente & { pedidos: Pedido[] };

/** P2002 = violación de restricción única (en este modelo, solo el email). */
export function esEmailDuplicado(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

/**
 * Lógica de negocio de clientes (equivalente a un @Service de Spring).
 * Recibe DTOs ya validados con Zod; la validación ocurre en la frontera (el controlador).
 */
export class ClienteService {
  constructor(private readonly prisma: PrismaClient) {}

  listar(): Promise<ClienteConPedidos[]> {
    return this.prisma.cliente.findMany({ include: { pedidos: true }, orderBy: { id: "asc" } });
  }

  buscarPorId(id: number): Promise<ClienteConPedidos | null> {
    return this.prisma.cliente.findUnique({ where: { id }, include: { pedidos: true } });
  }

  buscarPorEmail(email: string): Promise<ClienteConPedidos | null> {
    return this.prisma.cliente.findUnique({ where: { email }, include: { pedidos: true } });
  }

  async crear(dto: CrearClienteDto): Promise<Cliente> {
    try {
      return await this.prisma.cliente.create({
        data: { email: dto.email, nombre: dto.nombre, telefono: dto.telefono ?? null },
      });
    } catch (e) {
      if (esEmailDuplicado(e)) throw new ConflictoError(`Ya existe un cliente con el email ${dto.email}`);
      throw e;
    }
  }

  /**
   * Crea el cliente y sus pedidos con un "nested write".
   * Prisma lo ejecuta en una transacción: si un pedido falla, no se guarda nada.
   */
  async crearConPedidos(dto: CrearClienteConPedidosDto): Promise<ClienteConPedidos> {
    try {
      return await this.prisma.cliente.create({
        data: {
          email: dto.email,
          nombre: dto.nombre,
          telefono: dto.telefono ?? null,
          pedidos: { create: dto.pedidos.map((p) => ({ total: p.total })) },
        },
        include: { pedidos: true },
      });
    } catch (e) {
      if (esEmailDuplicado(e)) throw new ConflictoError(`Ya existe un cliente con el email ${dto.email}`);
      throw e;
    }
  }

  /**
   * Devuelve false si el cliente no existía. Se usa deleteMany para no lanzar error
   * (delete lanza P2025 si no encuentra el registro). Los pedidos se borran en cascada.
   */
  async eliminar(id: number): Promise<boolean> {
    const { count } = await this.prisma.cliente.deleteMany({ where: { id } });
    return count > 0;
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
