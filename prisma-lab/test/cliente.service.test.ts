import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { prisma } from "../src/db.js";
import { ClienteService } from "../src/services/cliente.services.js";

// Prueba de integración: usa un Postgres real (la base de .env.test).

const service = new ClienteService(prisma);

describe("ClienteService (Prisma)", () => {
  before(() => {
    // Aplica las migraciones a la base de pruebas. La CLI hereda las variables
    // de .env.test y dotenv no las sobrescribe con las de .env.
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
  });

  after(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE "pedido", "cliente" RESTART IDENTITY CASCADE`;
  });

  it("crea un cliente y lo encuentra por email", async () => {
    await service.crear({ email: "ana@test.cl", nombre: "Ana" });
    const ana = await service.buscarPorEmail("ana@test.cl");
    assert.equal(ana?.nombre, "Ana");
    assert.equal(ana?.telefono, null);
  });

  it("devuelve null si el email no existe", async () => {
    assert.equal(await service.buscarPorEmail("nadie@test.cl"), null);
  });

  it("rechaza emails duplicados", async () => {
    await service.crear({ email: "ana@test.cl", nombre: "Ana" });
    await assert.rejects(service.crear({ email: "ana@test.cl", nombre: "Otra Ana" }));
  });

  it("crea un cliente con sus pedidos", async () => {
    const cliente = await service.crearConPedidos({
      email: "ana@test.cl",
      nombre: "Ana",
      pedidos: [{ total: "15990.00" }, { total: "4990.00" }],
    });
    assert.equal(cliente.pedidos.length, 2);

    const [ana] = await service.totalesPorCliente();
    assert.deepEqual(ana, { nombre: "Ana", cantidad: 2, total: 20980 });
  });

  it("hace rollback si falla un pedido", async () => {
    // 100.000.000 no cabe en Decimal(10,2): Postgres rechaza el pedido y nada se guarda
    await assert.rejects(
      service.crearConPedidos({
        email: "diego@test.cl",
        nombre: "Diego",
        pedidos: [{ total: "9990.00" }, { total: "100000000.00" }],
      })
    );
    assert.equal(await service.buscarPorEmail("diego@test.cl"), null);
  });

  it("calcula totales incluyendo clientes sin pedidos", async () => {
    await service.crearConPedidos({ email: "ana@test.cl", nombre: "Ana", pedidos: [{ total: "15990.00" }, { total: "4990.00" }] });
    await service.crear({ email: "carla@test.cl", nombre: "Carla" });

    assert.deepEqual(await service.totalesPorCliente(), [
      { nombre: "Ana", cantidad: 2, total: 20980 },
      { nombre: "Carla", cantidad: 0, total: 0 },
    ]);
  });

  it("lista solo los clientes sin pedidos", async () => {
    await service.crearConPedidos({ email: "ana@test.cl", nombre: "Ana", pedidos: [{ total: "15990.00" }] });
    await service.crear({ email: "carla@test.cl", nombre: "Carla" });

    const resultado = await service.sinPedidos();
    assert.deepEqual(resultado.map((c) => c.nombre), ["Carla"]);
  });
});
