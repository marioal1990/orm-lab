import path from "node:path";

/**
 * Patrón de búsqueda de las migraciones según desde dónde corre el código:
 * con tsx (desarrollo) el archivo es .ts y se usan las migraciones .ts de src/;
 * después de `npm run build` es .js y se usan las migraciones compiladas de dist/.
 */
export function patronMigraciones(archivoActual: string): string {
  const extension = archivoActual.endsWith(".ts") ? "ts" : "js";
  return path.join(path.dirname(archivoActual), "migrations", `*.${extension}`);
}
