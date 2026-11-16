import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { execSync } from "node:child_process";
import { prisma } from "../src/db.js";
import { createApp } from "../src/app.js";
import { ClienteService } from "../src/services/cliente.services.js";

// Prueba de integración de la API: HTTP -> controlador -> servicio -> Postgres real.
// supertest llama a la app sin abrir un puerto (como MockMvc en Spring).

const app = createApp(new ClienteService(prisma));

type ClienteJson = { id: number; nombre: string; cantidadPedidos: number };

const crearCliente = (body: object) => request(app).post("/clientes").send(body).expect(201);

describe("API /clientes (Prisma)", () => {
  before(() => {
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
  });

  after(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE "pedido", "cliente" RESTART IDENTITY CASCADE`;
  });

  it("GET /health responde ok", async () => {
    const res = await request(app).get("/health").expect(200);
    assert.deepEqual(res.body, { status: "ok" });
  });

  it("POST /clientes crea un cliente sin pedidos (201 + Location)", async () => {
    const res = await crearCliente({ email: "ana@test.cl", nombre: "Ana" });
    assert.deepEqual(res.body, { id: 1, email: "ana@test.cl", nombre: "Ana", cantidadPedidos: 0 });
    assert.equal(res.headers.location, "/clientes/1");
  });

  it("POST /clientes crea un cliente con pedidos", async () => {
    const res = await crearCliente({
      email: "ana@test.cl",
      nombre: "Ana",
      pedidos: [{ total: "15990.00" }, { total: "4990.00" }],
    });
    assert.equal(res.body.cantidadPedidos, 2);
  });

  it("POST /clientes con datos inválidos responde 400 con el detalle", async () => {
    const res = await request(app).post("/clientes").send({ email: "no-es-email", nombre: "A" }).expect(400);
    assert.equal(res.body.error, "Datos inválidos");
    const campos = res.body.detalles.map((d: { campo: string }) => d.campo).sort();
    assert.deepEqual(campos, ["email", "nombre"]);
  });

  it("POST /clientes con JSON mal formado responde 400", async () => {
    const res = await request(app)
      .post("/clientes")
      .set("Content-Type", "application/json")
      .send('{"email": ')
      .expect(400);
    assert.match(res.body.error, /JSON/);
  });

  it("POST /clientes con email repetido responde 409", async () => {
    await crearCliente({ email: "ana@test.cl", nombre: "Ana" });
    const res = await request(app).post("/clientes").send({ email: "ana@test.cl", nombre: "Otra Ana" }).expect(409);
    assert.match(res.body.error, /ana@test\.cl/);
  });

  it("GET /clientes lista los clientes", async () => {
    await crearCliente({ email: "ana@test.cl", nombre: "Ana", pedidos: [{ total: "15990.00" }] });
    await crearCliente({ email: "carla@test.cl", nombre: "Carla" });

    const res = await request(app).get("/clientes").expect(200);
    assert.deepEqual(
      res.body.map((c: ClienteJson) => [c.nombre, c.cantidadPedidos]),
      [["Ana", 1], ["Carla", 0]]
    );
  });

  it("GET /clientes/:id devuelve el detalle con sus pedidos", async () => {
    await crearCliente({ email: "ana@test.cl", nombre: "Ana", pedidos: [{ total: "15990.00" }] });

    const res = await request(app).get("/clientes/1").expect(200);
    assert.deepEqual(res.body, {
      id: 1,
      email: "ana@test.cl",
      nombre: "Ana",
      cantidadPedidos: 1,
      telefono: null,
      pedidos: [{ id: 1, total: "15990.00", clienteId: 1 }],
    });
  });

  it("GET /clientes/:id responde 404 si no existe y 400 si el id no es válido", async () => {
    await request(app).get("/clientes/999").expect(404);
    const res = await request(app).get("/clientes/abc").expect(400);
    assert.equal(res.body.detalles[0].campo, "id");
  });

  it("DELETE /clientes/:id elimina el cliente (204) y luego responde 404", async () => {
    await crearCliente({ email: "ana@test.cl", nombre: "Ana", pedidos: [{ total: "15990.00" }] });

    await request(app).delete("/clientes/1").expect(204);
    await request(app).get("/clientes/1").expect(404);
    await request(app).delete("/clientes/1").expect(404);
  });

  it("GET /clientes/reportes/totales y /clientes/reportes/sin-pedidos", async () => {
    await crearCliente({ email: "ana@test.cl", nombre: "Ana", pedidos: [{ total: "15990.00" }, { total: "4990.00" }] });
    await crearCliente({ email: "carla@test.cl", nombre: "Carla" });

    const totales = await request(app).get("/clientes/reportes/totales").expect(200);
    assert.deepEqual(totales.body, [
      { nombre: "Ana", cantidad: 2, total: 20980 },
      { nombre: "Carla", cantidad: 0, total: 0 },
    ]);

    const sinPedidos = await request(app).get("/clientes/reportes/sin-pedidos").expect(200);
    assert.deepEqual(sinPedidos.body.map((c: ClienteJson) => c.nombre), ["Carla"]);
  });

  it("responde 404 en JSON para rutas inexistentes", async () => {
    const res = await request(app).get("/no-existe").expect(404);
    assert.match(res.body.error, /Ruta no encontrada/);
  });
});
