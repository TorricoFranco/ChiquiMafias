/**
 * Mensaje de un error capturado (`catch` sin tipar). Devuelve undefined si el valor no trae un `message` de texto,
 * así el caller cae en su mensaje por defecto con `getErrorMessage(e) || 'Mensaje por defecto'`.
 */
export const getErrorMessage = (error: unknown): string | undefined => {
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return undefined;
};
