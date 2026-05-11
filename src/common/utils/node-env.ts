/** Alineado con despliegues que usan NODE_ENV=prod en lugar de production. */
export function isProductionNodeEnv(nodeEnv: string | undefined): boolean {
  const n = (nodeEnv ?? '').toLowerCase().trim();
  return n === 'production' || n === 'prod';
}

export function isDevelopmentNodeEnv(nodeEnv: string | undefined): boolean {
  const n = (nodeEnv ?? '').toLowerCase().trim();
  return n === 'development' || n === 'dev';
}

/**
 * Cloud Run inyecta K_SERVICE / K_REVISION (contrato oficial).
 * Opcional: fuerza con `CLOUD_RUN=1` o `true` en variables del servicio si algún pipeline no expone K_*.
 * Desactiva el early-bind con `CLOUD_RUN_EARLY_BIND=0` o `false`.
 */
export function isCloudRunLike(): boolean {
  const off = process.env.CLOUD_RUN_EARLY_BIND?.trim().toLowerCase();
  if (off === '0' || off === 'false') {
    return false;
  }
  const on = process.env.CLOUD_RUN?.trim().toLowerCase();
  if (on === '1' || on === 'true') {
    return true;
  }
  return Boolean(process.env.K_SERVICE?.trim() || process.env.K_REVISION?.trim());
}
