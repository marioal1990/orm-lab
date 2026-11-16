import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { primero } from "../src/utils/primero.js";

describe("primero()", () => {
  it("devuelve la primera fila", () => {
    assert.equal(primero([10, 20]), 10);
  });

  it("lanza un error si no hay filas", () => {
    assert.throws(() => primero([]), /no devolvió filas/);
  });
});
