import express from "express";
import type { Express } from "express";
import { ClienteController } from "./controllers/cliente.controller.js";
import { manejadorErrores, rutaNoEncontrada } from "./middlewares/errores.js";
import type { ClienteService } from "./services/cliente.services.js";

/**
 * Arma la aplicación Express sin levantar el servidor.
 * Separarlo de server.ts permite probar la API con supertest sin abrir un puerto.
 */
export function createApp(clienteService: ClienteService): Express {
  const app = express();

  app.use(express.json()); // parsea el body JSON (como @RequestBody)

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/clientes", new ClienteController(clienteService).router());

  // Siempre al final: primero 404 y después el manejador de errores
  app.use(rutaNoEncontrada);
  app.use(manejadorErrores);

  return app;
}
