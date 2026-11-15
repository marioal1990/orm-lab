import { prisma } from "./db.js";

await prisma.$executeRaw`TRUNCATE "pedido", "cliente" RESTART IDENTITY CASCADE`;

await prisma.cliente.create({
  data: {
    email: "ana@test.cl",
    nombre: "Ana",
    pedidos: { create: [{ total: "15990.00" }, { total: "4990.00" }] },
  },
});

await prisma.cliente.create({
  data: {
    email: "bruno@test.cl",
    nombre: "Bruno",
    pedidos: { create: { total: "32500.00" } },
  },
});

await prisma.cliente.create({ data: { email: "carla@test.cl", nombre: "Carla" } });

console.log("Seed listo");
await prisma.$disconnect();