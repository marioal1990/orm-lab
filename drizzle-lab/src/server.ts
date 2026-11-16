import { createApp } from "./app.js";
import { db, pool } from "./db/index.js";
import { ClienteService } from "./services/cliente.services.js";

const PORT = Number(process.env.PORT ?? 3003);

const app = createApp(new ClienteService(db));

const server = app.listen(PORT, () => {
  console.log(`API (Drizzle) escuchando en http://localhost:${PORT}`);
});

// Cierre ordenado: deja de aceptar peticiones y luego cierra las conexiones a la base
function cerrar() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}
process.on("SIGINT", cerrar);
process.on("SIGTERM", cerrar);
