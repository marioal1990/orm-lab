import { Prisma } from "./generated/prisma/client.js";
import { prisma } from "./db.js";

try {
  await prisma.cliente.create({ data: { email: "ana@test.cl", nombre: "Otra Ana" } });
} catch (e) {
  console.log("Error al crear cliente:", (e as Error).message);
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    console.log("Email duplicado");
  } else throw e;
}

await prisma.$disconnect();