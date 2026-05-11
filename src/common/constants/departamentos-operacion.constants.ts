/**
 * Zona de operación del sistema: solo estos departamentos.
 * Nombres comparados sin tildes y en minúsculas.
 */
export function normalizarNombreDepartamento(nombre: string): string {
  return nombre.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

const NOMBRES_ZONA_OPERACION = new Set(['santander', 'norte de santander']);

export function esDepartamentoZonaOperacion(nombre: string | undefined | null): boolean {
  if (!nombre) return false;
  return NOMBRES_ZONA_OPERACION.has(normalizarNombreDepartamento(nombre));
}
