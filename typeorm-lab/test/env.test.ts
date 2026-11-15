import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { env } from "../src/utils/env.js";

describe("env()", () => {
  it("devuelve el valor de la variable", () => {
    process.env.PRUEBA_OK = "hola";
    assert.equal(env("PRUEBA_OK"), "hola");
  });

  it("lanza un error claro si la variable no existe", () => {
    delete process.env.PRUEBA_FALTA;
    assert.throws(() => env("PRUEBA_FALTA"), /Falta la variable de entorno PRUEBA_FALTA/);
  });
});