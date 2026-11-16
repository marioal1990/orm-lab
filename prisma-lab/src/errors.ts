/**
 * Errores de negocio. Los servicios los lanzan sin saber nada de HTTP;
 * el middleware de errores los traduce al código HTTP que corresponde.
 */

/** El recurso ya existe (por ejemplo, un email repetido). Se responde con 409 Conflict. */
export class ConflictoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictoError";
  }
}
