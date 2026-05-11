/** Alineado con despliegues que usan NODE_ENV=prod en lugar de production. */
export function isProductionNodeEnv(nodeEnv: string | undefined): boolean {
  const n = (nodeEnv ?? '').toLowerCase().trim();
  return n === 'production' || n === 'prod';
}

export function isDevelopmentNodeEnv(nodeEnv: string | undefined): boolean {
  const n = (nodeEnv ?? '').toLowerCase().trim();
  return n === 'development' || n === 'dev';
}
