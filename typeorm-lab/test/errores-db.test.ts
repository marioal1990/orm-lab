import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { QueryFailedError } from "typeorm";
import { esEmailDuplicado } from "../src/services/cliente.services.js";

// Prueba unitaria: cómo se reconoce el error de email duplicado de TypeORM + PostgreSQL.

const errorPg = (code: string) => Object.assign(new Error("error de postgres"), { code });

describe("esEmailDuplicado() (TypeORM)", () => {
  it("reconoce la violación de restricción única (23505)", () => {
    assert.equal(esEmailDuplicado(new QueryFailedError("INSERT ...", [], errorPg("23505"))), true);
  });

  it("ignora otros errores de PostgreSQL", () => {
    assert.equal(esEmailDuplicado(new QueryFailedError("INSERT ...", [], errorPg("22001"))), false);
  });

  it("ignora errores que no vienen de la base", () => {
    assert.equal(esEmailDuplicado(new Error("otro")), false);
  });
});
