export function mensajeError(error: unknown): string {
  const cuerpo = error as { error?: { mensaje?: string } };
  return cuerpo?.error?.mensaje || 'No se pudo completar la operación.';
}
