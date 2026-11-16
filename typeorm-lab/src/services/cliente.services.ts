import { QueryFailedError } from "typeorm";
import type { DataSource } from "typeorm";
import type { CrearClienteConPedidosDto, CrearClienteDto } from "../dtos/cliente.dto.js";
import { Cliente } from "../entities/Cliente.js";
import { Pedido } from "../entities/Pedido.js";
import { ConflictoError } from "../errors.js";

export interface TotalCliente {
  nombre: string;
  cantidad: number;
  total: number;
}

/** 23505 = unique_violation de PostgreSQL. TypeORM lo envuelve en QueryFailedError. */
export function esEmailDuplicado(e: unknown): boolean {
  return e instanceof QueryFailedError && (e.driverError as { code?: string }).code === "23505";
}

/**
 * Lógica de negocio de clientes (equivalente a un @Service de Spring).
 * Recibe DTOs ya validados con Zod; la validación ocurre en la frontera (el controlador).
 */
export class ClienteService {
  constructor(private readonly ds: DataSource) {}

  private get clientes() {
    return this.ds.getRepository(Cliente);
  }

  listar(): Promise<Cliente[]> {
    return this.clientes.find({ relations: { pedidos: true }, order: { id: "ASC" } });
  }

  buscarPorId(id: number): Promise<Cliente | null> {
    return this.clientes.findOne({ where: { id }, relations: { pedidos: true } });
  }

  buscarPorEmail(email: string): Promise<Cliente | null> {
    return this.clientes.findOne({ where: { email }, relations: { pedidos: true } });
  }

  async crear(dto: CrearClienteDto): Promise<Cliente> {
    try {
      return await this.clientes.save({
        email: dto.email,
        nombre: dto.nombre,
        telefono: dto.telefono ?? null,
      });
    } catch (e) {
      if (esEmailDuplicado(e)) throw new ConflictoError(`Ya existe un cliente con el email ${dto.email}`);
      throw e;
    }
  }

  /** Crea el cliente y sus pedidos en una sola transacción: todo o nada. */
  async crearConPedidos(dto: CrearClienteConPedidosDto): Promise<Cliente> {
    try {
      return await this.ds.transaction(async (manager) => {
        const cliente = await manager.getRepository(Cliente).save({
          email: dto.email,
          nombre: dto.nombre,
          telefono: dto.telefono ?? null,
        });

        cliente.pedidos = [];
        for (const p of dto.pedidos) {
          const pedido = await manager
            .getRepository(Pedido)
            .save({ total: p.total, cliente: { id: cliente.id } });
          cliente.pedidos.push(pedido);
        }
        return cliente;
      });
    } catch (e) {
      if (esEmailDuplicado(e)) throw new ConflictoError(`Ya existe un cliente con el email ${dto.email}`);
      throw e;
    }
  }

  /** Devuelve false si el cliente no existía. Sus pedidos se borran en cascada (ON DELETE CASCADE). */
  async eliminar(id: number): Promise<boolean> {
    const resultado = await this.clientes.delete({ id });
    return Boolean(resultado.affected);
  }

  async totalesPorCliente(): Promise<TotalCliente[]> {
    const filas = await this.clientes
      .createQueryBuilder("c")
      .leftJoin("c.pedidos", "p")
      .select("c.nombre", "nombre")
      .addSelect("COUNT(p.id)", "cantidad")
      .addSelect("COALESCE(SUM(p.total), 0)", "total")
      .groupBy("c.id")
      .orderBy("total", "DESC")
      .addOrderBy("c.nombre", "ASC")
      .getRawMany<{ nombre: string; cantidad: string; total: string }>();

    return filas.map((f) => ({
      nombre: f.nombre,
      cantidad: Number(f.cantidad),
      total: Number(f.total),
    }));
  }

  sinPedidos(): Promise<Cliente[]> {
    return this.clientes
      .createQueryBuilder("c")
      .leftJoin("c.pedidos", "p")
      .where("p.id IS NULL")
      .orderBy("c.nombre", "ASC")
      .getMany();
  }
}
