
/**
 * Clase que permite obtener variables de entorno
 * @param name Nombre de la variable de entorno
 * @returns Valor de la variable de entorno
 */
export function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}