import { ILike, MoreThan } from "typeorm";
import { AppDataSource } from "./data-source.js";
import { Cliente } from "./entities/Cliente.js";
import { Pedido } from "./entities/Pedido.js";

await AppDataSource.initialize();
const repoC = AppDataSource.getRepository(Cliente);
const repoP = AppDataSource.getRepository(Pedido);

// Buscar todos los clientes
console.log(await repoC.find());

// Buscar clientes con nombre que contenga "ana"
console.log(await repoC.find({ where: { nombre: ILike("%ana%") } }));

// A) Find options: filtro + orden
const conA = await repoC.find({ 
    where: { nombre: ILike("%ana%") }, 
    order: { nombre: "ASC" } 
});
console.log("A) Clientes con 'a':", conA);

// B) Buscar uno (devuelve null si no existe, como Optional vacío)
const ana = await repoC.findOneBy({ email: "ana@example.com" });
console.log("B) Ana:", ana);

// C) Pedidos mayores a 10.000 con su cliente
const grandes = await repoP.find({
    where: { total: MoreThan("10000") },
    relations: { cliente: true }
});
console.log("C) Pedidos mayores a 10.000:", grandes);

// D) QueryBuilder con join y parámetros
const conPedidos = await repoC
    .createQueryBuilder("c")
    .innerJoinAndSelect("c.pedidos", "p")
    .where("p.total > :min", { min: "5000" })
    .orderBy("c.nombre", "ASC")
    .getMany();
console.log("D) Clientes con pedidos mayores a 5.000:", JSON.stringify(conPedidos, null, 2));

// E) Agregación: total y cantidad de pedidos por cliente
const totales = await repoC
    .createQueryBuilder("c")
    .leftJoin("c.pedidos", "p")
    .select("c.nombre", "nombre")
    .addSelect("COUNT(p.id)", "cantidad")
    .addSelect("COALESCE(SUM(p.total), 0)", "total")
    .groupBy("c.id")
    .orderBy("total", "DESC")
    .getRawMany<{ nombre: string; cantidad: string; total: string }>();
console.table(totales);

await AppDataSource.destroy();