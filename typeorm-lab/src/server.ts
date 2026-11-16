import { createApp } from "./app.js";
import { AppDataSource } from "./data-source.js";
import { ClienteService } from "./services/cliente.services.js";

const PORT = Number(process.env.PORT ?? 3001);

await AppDataSource.initialize();
const app = createApp(new ClienteService(AppDataSource));

const server = app.listen(PORT, () => {
  console.log(`API (TypeORM) escuchando en http://localhost:${PORT}`);
});

// Cierre ordenado: deja de aceptar peticiones y luego cierra las conexiones a la base
function cerrar() {
  server.close(async () => {
    await AppDataSource.destroy();
    process.exit(0);
  });
}
process.on("SIGINT", cerrar);
process.on("SIGTERM", cerrar);
