import { prisma } from "./db.js";

// 1) Transacción interactiva: como @Transactional, con callback
try {
  await prisma.$transaction(async (tx) => {
    const diego = await tx.cliente.create({
      data: { email: "diego@test.cl", nombre: "Diego" },
    });
    await tx.pedido.create({ data: { total: "9990.00", clienteId: diego.id } });

    throw new Error("Falla simulada"); // ← ROLLBACK
  });
} catch (e) {
  console.log("Transacción revertida:", (e as Error).message);
}

const existe = await prisma.cliente.findUnique({ where: { email: "diego@test.cl" } });
console.log("¿Diego existe?", existe); // null

// 2) Transacción por lotes: varias operaciones independientes, todas o ninguna
const [actualizado, borrados] = await prisma.$transaction([
  prisma.cliente.update({ where: { email: "bruno@test.cl" }, data: { nombre: "Bruno Díaz" } }),
  prisma.pedido.deleteMany({ where: { total: { lt: 5000 } } }),
]);
console.log("Actualizado:", actualizado.nombre, "| Pedidos borrados:", borrados.count);

await prisma.$disconnect();