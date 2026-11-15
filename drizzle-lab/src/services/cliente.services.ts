import { asc, count, desc, eq, getTableColumns, isNull, sql } from "drizzle-orm";
import type { DB } from "../db/index.js";
import { clientes, pedidos } from "../db/schema.js";
import type { Cliente, Pedido } from "../db/schema.js";
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
  constructor(private readonly db: DB) {}

  async crear(dto: CrearClienteDto): Promise<Cliente> {
    const [cliente] = await this.db
      .insert(clientes)
      .values({ email: dto.email, nombre: dto.nombre, telefono: dto.telefono ?? null })
      .returning();
    if (!cliente) throw new Error("No se pudo crear el cliente");
    return cliente;
  }

  async buscarPorEmail(email: string): Promise<ClienteConPedidos | null> {
    // API relacional: parecida a Prisma (findFirst + with)
    const cliente = await this.db.query.clientes.findFirst({
      where: eq(clientes.email, email),
      with: { pedidos: true },
    });
    return cliente ?? null;
  }

  /** Crea el cliente y sus pedidos en una sola transacción: todo o nada. */
  crearConPedidos(dto: CrearClienteConPedidosDto): Promise<ClienteConPedidos> {
    return this.db.transaction(async (tx) => {
      const [cliente] = await tx
        .insert(clientes)
        .values({ email: dto.email, nombre: dto.nombre, telefono: dto.telefono ?? null })
        .returning();
      if (!cliente) throw new Error("No se pudo crear el cliente");

      // Un solo INSERT con varias filas
      const nuevos = await tx
        .insert(pedidos)
        .values(dto.pedidos.map((p) => ({ total: p.total, clienteId: cliente.id })))
        .returning();

      return { ...cliente, pedidos: nuevos };
    });
  }

  async totalesPorCliente(): Promise<TotalCliente[]> {
    // API SQL: se lee casi igual que el SQL que genera
    const total = sql<string>`coalesce(sum(${pedidos.total}), 0)`;

    const filas = await this.db
      .select({ nombre: clientes.nombre, cantidad: count(pedidos.id), total })
      .from(clientes)
      .leftJoin(pedidos, eq(pedidos.clienteId, clientes.id))
      .groupBy(clientes.id)
      .orderBy(desc(total), asc(clientes.nombre));

    return filas.map((f) => ({ nombre: f.nombre, cantidad: f.cantidad, total: Number(f.total) }));
  }

  sinPedidos(): Promise<Cliente[]> {
    return this.db
      .select(getTableColumns(clientes))
      .from(clientes)
      .leftJoin(pedidos, eq(pedidos.clienteId, clientes.id))
      .where(isNull(pedidos.id))
      .orderBy(asc(clientes.nombre));
  }
}
