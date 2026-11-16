/**
 * Devuelve la primera fila de un resultado, o lanza un error si viene vacío.
 * Útil con `INSERT ... RETURNING`, que devuelve un arreglo aunque se inserte una sola fila
 * (con noUncheckedIndexedAccess, `filas[0]` es `T | undefined`).
 */
export function primero<T>(filas: T[]): T {
  const [fila] = filas;
  if (fila === undefined) throw new Error("La consulta no devolvió filas");
  return fila;
}
