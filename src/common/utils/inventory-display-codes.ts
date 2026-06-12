/** Códigos internos (idempotencia / trazabilidad) que no deben mostrarse al usuario. */
export function isInternalInventoryCode(codigo: string | null | undefined): boolean {
  const c = String(codigo || '').trim();
  if (!c) return false;
  return (
    /^MOV-/i.test(c) ||
    /^ASIG-CLIENT-/i.test(c) ||
    /^SALIDA-ASIG-/i.test(c) ||
    /^SALIDA-TECNICO-/i.test(c) ||
    /^SALIDA-AUTO-/i.test(c) ||
    /^TRASLADO-/i.test(c) ||
    /-TECNICO-\d+$/i.test(c)
  );
}

export function isPublicAsignacionCodigo(codigo: string | null | undefined): boolean {
  return /^ASIG-\d+$/i.test(String(codigo || '').trim());
}

export function isPublicMovimientoIdentificador(ident: string | null | undefined): boolean {
  return /^(ENT|SAL|DEV)-\d+$/i.test(String(ident || '').trim());
}

/** Código legible para asignaciones (ASIG-N). Datos legacy → ASIG-{id}. */
export function formatAsignacionDisplayCodigo(
  asignacionCodigo: string | null | undefined,
  asignacionId?: number,
): string {
  const raw = String(asignacionCodigo || '').trim();
  if (isPublicAsignacionCodigo(raw)) {
    const n = raw.match(/^ASIG-(\d+)$/i)?.[1];
    return n ? `ASIG-${n}` : raw.toUpperCase();
  }
  if (asignacionId != null && Number(asignacionId) > 0) {
    return `ASIG-${asignacionId}`;
  }
  return raw || '-';
}

/** Código legible para movimientos agrupados o detalle. */
export function formatMovimientoDisplayCodigo(opts: {
  movimientoCodigo?: string | null;
  identificadorUnico?: string | null;
  movimientoTipo?: string | null;
  movimientoId?: number | null;
}): string {
  const ident = String(opts.identificadorUnico || '').trim();
  if (isPublicMovimientoIdentificador(ident)) {
    return ident.toUpperCase();
  }

  const codigo = String(opts.movimientoCodigo || '').trim();
  if (codigo && !isInternalInventoryCode(codigo)) {
    return codigo;
  }

  const tipo = String(opts.movimientoTipo || '').toLowerCase();
  const prefix =
    tipo === 'entrada' ? 'ENT' : tipo === 'salida' ? 'SAL' : tipo === 'devolucion' ? 'DEV' : 'MOV';
  const id = opts.movimientoId != null ? Number(opts.movimientoId) : 0;
  if (Number.isFinite(id) && id > 0) {
    return `${prefix}-${id}`;
  }
  return codigo || '-';
}

/** Si el código de asignación es interno, generar uno nuevo en su lugar. */
export function shouldAutoGenerateAsignacionCodigo(codigo: string | null | undefined): boolean {
  const raw = String(codigo || '').trim();
  if (!raw) return true;
  return !isPublicAsignacionCodigo(raw);
}
