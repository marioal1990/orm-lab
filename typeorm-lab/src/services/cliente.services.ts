import type { DataSource } from "typeorm";
import type { CrearClienteConPedidosDto, CrearClienteDto } from "../dtos/cliente.dto.js";
import { Cliente } from "../entities/Cliente.js";
import { Pedido } from "../entities/Pedido.js";

export interface TotalCliente {
  nombre: string;
  cantidad: number;
  total: number;
}

/**
 * Lógica de negocio de clientes (equivalente a un @Service de Spring).
 * Recibe DTOs ya validados con Zod; la validación ocurre en la frontera.
 */
export class ClienteService {
  constructor(private readonly ds: DataSource) {}

  private get clientes() {
    return this.ds.getRepository(Cliente);
  }

  crear(dto: CrearClienteDto): Promise<Cliente> {
    return this.clientes.save({
      email: dto.email,
      nombre: dto.nombre,
      telefono: dto.telefono ?? null,
    });
  }

  buscarPorEmail(email: string): Promise<Cliente | null> {
    return this.clientes.findOne({ where: { email }, relations: { pedidos: true } });
  }

  /** Crea el cliente y sus pedidos en una sola transacción: todo o nada. */
  crearConPedidos(dto: CrearClienteConPedidosDto): Promise<Cliente> {
    return this.ds.transaction(async (manager) => {
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
