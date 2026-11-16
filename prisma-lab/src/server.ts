import { createApp } from "./app.js";
import { prisma } from "./db.js";
import { ClienteService } from "./services/cliente.services.js";

const PORT = Number(process.env.PORT ?? 3002);

const app = createApp(new ClienteService(prisma));

const server = app.listen(PORT, () => {
  console.log(`API (Prisma) escuchando en http://localhost:${PORT}`);
});

// Cierre ordenado: deja de aceptar peticiones y luego cierra las conexiones a la base
function cerrar() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on("SIGINT", cerrar);
process.on("SIGTERM", cerrar);
