import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { ConflictoError } from "../errors.js";

/** Rutas que no existen: 404 en JSON (por defecto Express responde HTML). */
export const rutaNoEncontrada: RequestHandler = (req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
};

/**
 * Manejo centralizado de errores (equivalente a un @RestControllerAdvice de Spring).
 * Express 5 envía aquí automáticamente cualquier error lanzado en un controlador async.
 * Debe tener 4 parámetros para que Express lo reconozca como manejador de errores.
 */
export const manejadorErrores: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Datos inválidos",
      detalles: err.issues.map((i) => ({ campo: i.path.join("."), mensaje: i.message })),
    });
    return;
  }

  if (err instanceof ConflictoError) {
    res.status(409).json({ error: err.message });
    return;
  }

  // express.json() lanza este error cuando el body no es un JSON válido
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: "El cuerpo de la petición no es un JSON válido" });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
};
