import { DrizzleQueryError, asc, count, desc, eq, getTableColumns, isNull, sql } from "drizzle-orm";
import { DatabaseError } from "pg";
import type { DB } from "../db/index.js";
import { clientes, pedidos } from "../db/schema.js";
import type { Cliente, Pedido } from "../db/schema.js";
import type { CrearClienteConPedidosDto, CrearClienteDto } from "../dtos/cliente.dto.js";
import { ConflictoError } from "../errors.js";
import { primero } from "../utils/primero.js";

export interface TotalCliente {
  nombre: string;
  cantidad: number;
  total: number;
}

export type ClienteConPedidos = Cliente & { pedidos: Pedido[] };

/** 23505 = unique_violation de PostgreSQL. Drizzle envuelve el error del driver en `cause`. */
export function esEmailDuplicado(e: unknown): boolean {
  const causa = e instanceof DrizzleQueryError ? e.cause : e;
  return causa instanceof DatabaseError && causa.code === "23505";
}

/**
 * Lógica de negocio de clientes (equivalente a un @Service de Spring).
 * Recibe DTOs ya validados con Zod; la validación ocurre en la frontera (el controlador).
 */
export class ClienteService {
  constructor(private readonly db: DB) {}

  listar(): Promise<ClienteConPedidos[]> {
    return this.db.query.clientes.findMany({ with: { pedidos: true }, orderBy: asc(clientes.id) });
  }

  async buscarPorId(id: number): Promise<ClienteConPedidos | null> {
    const cliente = await this.db.query.clientes.findFirst({
      where: eq(clientes.id, id),
      with: { pedidos: true },
    });
    return cliente ?? null;
  }

  async buscarPorEmail(email: string): Promise<ClienteConPedidos | null> {
    // API relacional: parecida a Prisma (findFirst + with)
    const cliente = await this.db.query.clientes.findFirst({
      where: eq(clientes.email, email),
      with: { pedidos: true },
    });
    return cliente ?? null;
  }

  async crear(dto: CrearClienteDto): Promise<Cliente> {
    try {
      const filas = await this.db
        .insert(clientes)
        .values({ email: dto.email, nombre: dto.nombre, telefono: dto.telefono ?? null })
        .returning();
      return primero(filas);
    } catch (e) {
      if (esEmailDuplicado(e)) throw new ConflictoError(`Ya existe un cliente con el email ${dto.email}`);
      throw e;
    }
  }

  /** Crea el cliente y sus pedidos en una sola transacción: todo o nada. */
  async crearConPedidos(dto: CrearClienteConPedidosDto): Promise<ClienteConPedidos> {
    try {
      return await this.db.transaction(async (tx) => {
        const cliente = primero(
          await tx
            .insert(clientes)
            .values({ email: dto.email, nombre: dto.nombre, telefono: dto.telefono ?? null })
            .returning()
        );

        // Un solo INSERT con varias filas
        const nuevos = await tx
          .insert(pedidos)
          .values(dto.pedidos.map((p) => ({ total: p.total, clienteId: cliente.id })))
          .returning();

        return { ...cliente, pedidos: nuevos };
      });
    } catch (e) {
      if (esEmailDuplicado(e)) throw new ConflictoError(`Ya existe un cliente con el email ${dto.email}`);
      throw e;
    }
  }

  /** Devuelve false si el cliente no existía. Sus pedidos se borran en cascada (ON DELETE CASCADE). */
  async eliminar(id: number): Promise<boolean> {
    const borrados = await this.db.delete(clientes).where(eq(clientes.id, id)).returning({ id: clientes.id });
    return borrados.length > 0;
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
