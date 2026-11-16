import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "../src/generated/prisma/client.js";
import { esEmailDuplicado } from "../src/services/cliente.services.js";

// Prueba unitaria: cómo se reconoce el error de email duplicado de Prisma.

const errorPrisma = (code: string) =>
  new Prisma.PrismaClientKnownRequestError("error de prisma", { code, clientVersion: "7" });

describe("esEmailDuplicado() (Prisma)", () => {
  it("reconoce la violación de restricción única (P2002)", () => {
    assert.equal(esEmailDuplicado(errorPrisma("P2002")), true);
  });

  it("ignora otros errores conocidos de Prisma", () => {
    assert.equal(esEmailDuplicado(errorPrisma("P2000")), false);
  });

  it("ignora errores que no vienen de Prisma", () => {
    assert.equal(esEmailDuplicado(new Error("otro")), false);
  });
});
