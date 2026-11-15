import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import type { Relation } from "typeorm";
import { Pedido } from "./Pedido.js";

@Entity()
export class Cliente {
  @PrimaryGeneratedColumn() id!: number;

  @Column("varchar", { unique: true }) email!: string;

  @Column("varchar") nombre!: string;

  @Column("varchar", { length: 20, nullable: true }) telefono!: string | null;

  // Relation<...> evita el error "Cannot access before initialization"
  // por el import circular Cliente <-> Pedido en ESM.
  @OneToMany(() => Pedido, (p) => p.cliente) pedidos!: Relation<Pedido[]>;
}
