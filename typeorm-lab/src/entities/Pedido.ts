import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import type { Relation } from "typeorm";
import { Cliente } from "./Cliente.js";

@Entity()
export class Pedido {
  @PrimaryGeneratedColumn() id!: number;

  // numeric llega como string desde el driver pg (para no perder precisión)
  @Column("numeric", { precision: 10, scale: 2 }) total!: string;

  @ManyToOne(() => Cliente, (c) => c.pedidos, { onDelete: "CASCADE" })
  cliente!: Relation<Cliente>;

  @CreateDateColumn() creadoEn!: Date;
}
