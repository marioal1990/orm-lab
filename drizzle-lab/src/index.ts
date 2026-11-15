import { z } from "zod";
import { db, pool } from "./db/index.js";
import { CrearClienteConPedidosSchema } from "./dtos/cliente.dto.js";
import { toClienteResponse } from "./mappers/cliente.mapper.js";
import { toPedidoResponse } from "./mappers/pedido.mapper.js";
import { ClienteService } from "./services/cliente.services.js";

// Flujo completo: JSON de entrada -> validación (DTO) -> servicio -> respuesta (mapper).
// `body` simula lo que llegaría en un POST /clientes.
const body: unknown = {
  email: "john@example.com",
  nombre: "John Doe",
  pedidos: [{ total: "15990.00" }, { total: "4990.00" }],
};

const resultado = CrearClienteConPedidosSchema.safeParse(body);
if (!resultado.success) {
  console.error("Datos inválidos:\n" + z.prettifyError(resultado.error));
  process.exit(1);
}

try {
  const service = new ClienteService(db);

  // Idempotente: si ya existe, no lo vuelve a crear (el email es único)
  const existente = await service.buscarPorEmail(resultado.data.email);
  const cliente = existente ?? (await service.crearConPedidos(resultado.data));

  console.log(existente ? "El cliente ya existía:" : "Cliente creado:", toClienteResponse(cliente));
  console.log("Pedidos:", cliente.pedidos.map(toPedidoResponse));
} finally {
  await pool.end();
}
