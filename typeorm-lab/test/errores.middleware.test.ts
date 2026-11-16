import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Request, Response } from "express";
import { z } from "zod";
import { ConflictoError } from "../src/errors.js";
import { manejadorErrores, rutaNoEncontrada } from "../src/middlewares/errores.js";

// Pruebas unitarias del middleware de errores: se llama directamente, sin servidor ni base.

/** Respuesta falsa que registra el código y el JSON enviados. */
function respuestaFalsa() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res.body = body;
      return res;
    },
  };
  return res;
}

function manejar(error: unknown) {
  const res = respuestaFalsa();
  manejadorErrores(error, {} as Request, res as unknown as Response, () => {});
  return res;
}

describe("manejadorErrores()", () => {
  it("ZodError -> 400 con el detalle de cada campo", () => {
    const resultado = z.object({ email: z.email("Email inválido") }).safeParse({ email: "x" });
    assert.ok(!resultado.success);

    const res = manejar(resultado.error);
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: "Datos inválidos", detalles: [{ campo: "email", mensaje: "Email inválido" }] });
  });

  it("ConflictoError -> 409 con su mensaje", () => {
    const res = manejar(new ConflictoError("Ya existe"));
    assert.equal(res.statusCode, 409);
    assert.deepEqual(res.body, { error: "Ya existe" });
  });

  it("JSON mal formado -> 400", () => {
    const res = manejar({ type: "entity.parse.failed" });
    assert.equal(res.statusCode, 400);
  });

  it("cualquier otro error -> 500 sin exponer el detalle", (t) => {
    const consola = t.mock.method(console, "error", () => {}); // silencia el log en la prueba
    const res = manejar(new Error("detalle interno"));

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { error: "Error interno del servidor" });
    assert.equal(consola.mock.callCount(), 1); // pero sí queda registrado en el log
  });

  it("un valor que no es un objeto -> 500", (t) => {
    t.mock.method(console, "error", () => {});
    assert.equal(manejar(null).statusCode, 500);
  });
});

describe("rutaNoEncontrada()", () => {
  it("responde 404 indicando el método y la ruta", () => {
    const res = respuestaFalsa();
    rutaNoEncontrada({ method: "GET", path: "/x" } as Request, res as unknown as Response, () => {});
    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, { error: "Ruta no encontrada: GET /x" });
  });
});
