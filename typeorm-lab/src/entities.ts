import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, CreateDateColumn } from "typeorm";

@Entity()
export class Cliente {
    @PrimaryGeneratedColumn() id!: number;
    @Column('varchar', { unique: true }) email!: string;
    @Column('varchar') nombre!: string;
    @OneToMany(() => Pedido, (p) => p.cliente) pedidos!: Pedido[];
}

@Entity()
export class Pedido {
    @PrimaryGeneratedColumn() id!: number;
    @Column('numeric', { precision: 10, scale: 2 }) total!: string;
    @ManyToOne(() => Cliente, (c) => c.pedidos, { onDelete: "CASCADE" }) cliente!: Cliente;
    @CreateDateColumn() creadoEn!: Date;
}