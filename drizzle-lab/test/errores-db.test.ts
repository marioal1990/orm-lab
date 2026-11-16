import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DrizzleQueryError } from "drizzle-orm";
import { DatabaseError } from "pg";
import { esEmailDuplicado } from "../src/services/cliente.services.js";

// Prueba unitaria: cómo se reconoce el error de email duplicado de Drizzle + pg.

const errorPg = (code: string) => Object.assign(new DatabaseError("error de postgres", 0, "error"), { code });

describe("esEmailDuplicado() (Drizzle)", () => {
  it("reconoce la violación de restricción única (23505) envuelta por Drizzle", () => {
    assert.equal(esEmailDuplicado(new DrizzleQueryError("insert ...", [], errorPg("23505"))), true);
  });

  it("reconoce el error del driver aunque no venga envuelto", () => {
    assert.equal(esEmailDuplicado(errorPg("23505")), true);
  });

  it("ignora otros errores de PostgreSQL", () => {
    assert.equal(esEmailDuplicado(new DrizzleQueryError("insert ...", [], errorPg("22001"))), false);
  });

  it("ignora errores que no vienen de la base", () => {
    assert.equal(esEmailDuplicado(new Error("otro")), false);
  });
});
