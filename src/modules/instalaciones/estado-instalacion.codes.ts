import { EstadoInstalacion } from './instalacion.entity';

/** Códigos de estado (v2). Abreviaturas: APM, PPC, AAT, AVAN, CONS, CERT, FACT, NOVE, DEV. */
export const ESTADOS_INSTALACION_CODIGOS = [
  'apm',
  'ppc',
  'aat',
  'avan',
  'cons',
  'cert',
  'fact',
  'nove',
  'dev',
] as const;

export type EstadoInstalacionCodigo = (typeof ESTADOS_INSTALACION_CODIGOS)[number];

/** Flujo principal (orden de avance típico). */
export const PIPELINE_ESTADOS: EstadoInstalacionCodigo[] = [
  'apm',
  'ppc',
  'aat',
  'avan',
  'cons',
  'cert',
  'fact',
];

const LEGACY_A_ESTADO_V2: Record<string, EstadoInstalacion> = {
  pendiente: EstadoInstalacion.PPC,
  asignacion: EstadoInstalacion.AAT,
  construccion: EstadoInstalacion.AVAN,
  certificacion: EstadoInstalacion.CERT,
  completada: EstadoInstalacion.FACT,
  novedad: EstadoInstalacion.NOVE,
  en_proceso: EstadoInstalacion.AAT,
  finalizada: EstadoInstalacion.FACT,
  /** Antes “anulada”; ahora ciclo de cierre vía devuelta */
  anulada: EstadoInstalacion.DEV,
  cancelada: EstadoInstalacion.DEV,
};

const CANONICOS = new Set<string>([...ESTADOS_INSTALACION_CODIGOS]);

/** Convierte códigos legacy o v2 a valor de enum actual. */
export function normalizarEstadoInstalacionCodigo(raw: string): EstadoInstalacion {
  const c = (raw || '').toLowerCase().trim();
  if (LEGACY_A_ESTADO_V2[c]) return LEGACY_A_ESTADO_V2[c];
  return c as EstadoInstalacion;
}

export function esEstadoInstalacionCanonico(c: string): boolean {
  return CANONICOS.has((c || '').toLowerCase().trim());
}

/**
 * Estados en los que el técnico/soldador puede registrar, editar o quitar materiales utilizados en obra.
 * A partir de construida (CONS), certificación, facturación, etc., el flujo lo maneja el sistema / roles administrativos.
 */
export function instalacionPermiteTecnicoGestionarMaterialesUtilizados(
  estadoRaw: string | null | undefined,
): boolean {
  const e = normalizarEstadoInstalacionCodigo(String(estadoRaw ?? ''));
  return e === EstadoInstalacion.AVAN || e === EstadoInstalacion.NOVE;
}
