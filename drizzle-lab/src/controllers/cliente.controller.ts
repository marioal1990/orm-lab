import express from "express";
import type { Request, Response, Router } from "express";
import { CrearClienteConPedidosSchema, CrearClienteSchema, ParamsIdSchema } from "../dtos/cliente.dto.js";
import { toClienteDetalleResponse, toClienteResponse } from "../mappers/cliente.mapper.js";
import type { ClienteService } from "../services/cliente.services.js";

/**
 * Controlador REST de clientes (equivalente a un @RestController de Spring).
 *
 * Solo traduce HTTP <-> servicio: valida la entrada con los DTOs (Zod), llama al servicio
 * y arma la respuesta con los mappers. No sabe qué ORM hay detrás: es idéntico en
 * typeorm-lab, prisma-lab y drizzle-lab.
 *
 * Los errores (ZodError, ConflictoError...) no se manejan aquí: los convierte en
 * respuestas HTTP el middleware de errores (src/middlewares/errores.ts).
 */
export class ClienteController {
  constructor(private readonly service: ClienteService) {}

  /** Rutas del recurso, montadas en /clientes (ver src/app.ts). */
  router(): Router {
    const router = express.Router();
    router.get("/", this.listar);
    router.post("/", this.crear);
    router.get("/reportes/totales", this.totales);
    router.get("/reportes/sin-pedidos", this.sinPedidos);
    router.get("/:id", this.obtener);
    router.delete("/:id", this.eliminar);
    return router;
  }

  // Se definen como funciones flecha para que `this` siga apuntando al controlador
  // cuando Express las llama.

  /** GET /clientes */
  listar = async (_req: Request, res: Response) => {
    const clientes = await this.service.listar();
    res.json(clientes.map(toClienteResponse));
  };

  /** GET /clientes/:id */
  obtener = async (req: Request, res: Response) => {
    const { id } = ParamsIdSchema.parse(req.params);
    const cliente = await this.service.buscarPorId(id);
    if (!cliente) {
      res.status(404).json({ error: `No existe el cliente ${id}` });
      return;
    }
    res.json(toClienteDetalleResponse(cliente));
  };

  /** POST /clientes (con o sin pedidos) */
  crear = async (req: Request, res: Response) => {
    const body: unknown = req.body;
    const conPedidos = typeof body === "object" && body !== null && "pedidos" in body;

    const cliente = conPedidos
      ? await this.service.crearConPedidos(CrearClienteConPedidosSchema.parse(body))
      : await this.service.crear(CrearClienteSchema.parse(body));

    res.status(201).location(`/clientes/${cliente.id}`).json(toClienteResponse(cliente));
  };

  /** DELETE /clientes/:id (sus pedidos se borran en cascada) */
  eliminar = async (req: Request, res: Response) => {
    const { id } = ParamsIdSchema.parse(req.params);
    const eliminado = await this.service.eliminar(id);
    if (!eliminado) {
      res.status(404).json({ error: `No existe el cliente ${id}` });
      return;
    }
    res.status(204).end();
  };

  /** GET /clientes/reportes/totales */
  totales = async (_req: Request, res: Response) => {
    res.json(await this.service.totalesPorCliente());
  };

  /** GET /clientes/reportes/sin-pedidos */
  sinPedidos = async (_req: Request, res: Response) => {
    const clientes = await this.service.sinPedidos();
    res.json(clientes.map(toClienteResponse));
  };
}
