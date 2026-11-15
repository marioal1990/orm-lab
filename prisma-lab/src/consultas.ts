import type { Prisma } from "./generated/prisma/client.js";
import { prisma } from "./db.js";

// A) Filtro + orden
const conA = await prisma.cliente.findMany({
  where: { nombre: { contains: "a", mode: "insensitive" } },
  orderBy: { nombre: "asc" },
});
console.log("A)", conA);

// B) Buscar por campo único (null si no existe)
const ana = await prisma.cliente.findUnique({ where: { email: "ana@test.cl" } });
console.log("B)", ana);

// C) Pedidos > 10.000 con su cliente
const grandes = await prisma.pedido.findMany({
  where: { total: { gt: 10000 } },
  include: { cliente: true },
});
console.log("C)", grandes);

// D) Clientes que tienen algún pedido > 5000, trayendo solo esos pedidos
const conPedidos = await prisma.cliente.findMany({
  where: { pedidos: { some: { total: { gt: 5000 } } } },
  include: { pedidos: { where: { total: { gt: 5000 } } } },
  orderBy: { nombre: "asc" },
});
console.log("D)", JSON.stringify(conPedidos, null, 2));

// E1) Agregación con groupBy (por clienteId, sin nombre)
const porCliente = await prisma.pedido.groupBy({
  by: ["clienteId"],
  _count: { _all: true },
  _sum: { total: true },
  orderBy: { _sum: { total: "desc" } },
});
console.log("E1)", porCliente);

// E2) Contar relaciones sin traerlas
const conteo = await prisma.cliente.findMany({
  select: { nombre: true, _count: { select: { pedidos: true } } },
});
console.log("E2)", conteo);

// E3) SQL nativo tipado para el reporte completo
const totales = await prisma.$queryRaw<
  { nombre: string; cantidad: bigint; total: Prisma.Decimal }[]
>`
  SELECT c.nombre, COUNT(p.id) AS cantidad, COALESCE(SUM(p.total), 0) AS total
  FROM cliente c
  LEFT JOIN pedido p ON p.cliente_id = c.id
  GROUP BY c.id
  ORDER BY total DESC
`;
console.table(
  totales.map((t) => ({ nombre: t.nombre, cantidad: Number(t.cantidad), total: t.total.toString() }))
);

await prisma.$disconnect();