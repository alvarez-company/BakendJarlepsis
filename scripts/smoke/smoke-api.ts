/**
 * Smoke tests HTTP contra la API en ejecución (sin levantar Nest en Jest).
 *
 * Variables:
 *   SMOKE_BASE_URL   URL base con prefijo /api/v1 (ej: http://localhost:4100/api/v1)
 *   SMOKE_EMAIL      Usuario con permisos de lectura razonables (ej: admin)
 *   SMOKE_PASSWORD
 *   SMOKE_TIMEOUT_MS (opcional, default 30000)
 *
 * Ejemplo:
 *   SMOKE_BASE_URL=http://localhost:4100/api/v1 SMOKE_EMAIL=admin@jarlepsis.com SMOKE_PASSWORD=Admin1234 npm run smoke
 *
 * Flujo de inventario completo (más pesado): scripts/perf/inventario-funcional.ts
 */
export {};

type Json = Record<string, unknown> | unknown[] | null;

function must(v: string | undefined, name: string): string {
  if (!v || !String(v).trim()) throw new Error(`Falta variable de entorno ${name}`);
  return String(v).trim();
}

function unwrap<T = Json>(body: unknown): T {
  if (body && typeof body === 'object' && 'data' in (body as object)) {
    return (body as { data: T }).data;
  }
  return body as T;
}

function asArray<T = unknown>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function buildApiUrl(baseUrl: string, path: string): string {
  const cleanBase = baseUrl.replace(/\/$/, '');
  const pathNorm = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${pathNorm}`;
}

async function httpJson(
  baseUrl: string,
  path: string,
  opts: RequestInit & { token?: string } = {},
): Promise<unknown> {
  const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 30000);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  const url = buildApiUrl(baseUrl, path);
  const res = await fetch(url, {
    ...opts,
    signal: controller.signal,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.headers as Record<string, string> | undefined),
    },
  });
  clearTimeout(t);
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${path}: ${text.slice(0, 500)}`);
  }
  return data;
}

async function httpJsonAllowError(
  baseUrl: string,
  path: string,
  opts: RequestInit & { token?: string } = {},
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 30000);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  const url = buildApiUrl(baseUrl, path);
  const res = await fetch(url, {
    ...opts,
    signal: controller.signal,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.headers as Record<string, string> | undefined),
    },
  });
  clearTimeout(t);
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body };
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`SMOKE_FAIL: ${msg}`);
}

async function main() {
  const baseUrl = must(process.env.SMOKE_BASE_URL, 'SMOKE_BASE_URL');
  const email = must(process.env.SMOKE_EMAIL, 'SMOKE_EMAIL');
  const password = must(process.env.SMOKE_PASSWORD, 'SMOKE_PASSWORD');

  console.log(`[smoke] base: ${baseUrl}`);

  const healthRaw = await httpJson(baseUrl, '/health', { method: 'GET' });
  const health = unwrap<{ status?: string }>(healthRaw);
  assert(health && typeof health === 'object', 'health: respuesta inválida');
  assert((health as { status?: string }).status === 'ok', 'health: status !== ok');

  const loginRaw = await httpJson(baseUrl, '/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const login = unwrap<{ access_token?: string }>(loginRaw);
  const token = login?.access_token;
  assert(token && typeof token === 'string', 'login: sin access_token');

  const meRaw = await httpJson(baseUrl, '/users/me', { method: 'GET', token });
  const me = unwrap<{ usuarioId?: number }>(meRaw);
  assert(me?.usuarioId && Number(me.usuarioId) > 0, '/users/me: sin usuarioId');

  const sedesRaw = await httpJson(baseUrl, '/sedes', { method: 'GET', token });
  const sedes = asArray(unwrap(sedesRaw));
  assert(sedes.length >= 1, '/sedes: lista vacía');

  const bodegasRaw = await httpJson(baseUrl, '/bodegas', { method: 'GET', token });
  const bodegas = asArray<{ sedeId?: number; bodegaTipo?: string | null; bodegaId?: number }>(
    unwrap(bodegasRaw),
  );
  assert(bodegas.length >= 1, '/bodegas: lista vacía');

  const sedeIds = Array.from(
    new Set(sedes.map((s: any) => Number(s?.sedeId)).filter((n) => Number.isFinite(n) && n > 0)),
  );
  for (const sid of sedeIds) {
    const centros = bodegas.filter(
      (b) => Number(b?.sedeId) === sid && String(b?.bodegaTipo || '').toLowerCase() === 'centro',
    );
    assert(
      centros.length >= 1,
      `Cada sede debe tener bodega tipo "centro" (sedeId=${sid}, encontradas=${centros.length})`,
    );
  }

  const invRaw = await httpJson(baseUrl, '/inventarios', { method: 'GET', token });
  const inventarios = asArray(unwrap(invRaw));
  assert(inventarios.length >= 1, '/inventarios: lista vacía');

  const matRes = await httpJsonAllowError(baseUrl, '/materiales', { method: 'GET', token });
  assert(matRes.ok, `/materiales: HTTP ${matRes.status}`);
  const matBody = unwrap(matRes.body) as any;
  const materiales = Array.isArray(matBody) ? matBody : asArray(matBody?.data ?? matBody?.items);
  assert(materiales.length >= 1, '/materiales: sin filas (revisar paginación o permisos)');

  const movRes = await httpJsonAllowError(baseUrl, '/movimientos?page=1&limit=5', { method: 'GET', token });
  if (!movRes.ok) {
    console.warn(`[smoke] /movimientos omitido (HTTP ${movRes.status}) — puede ser restricción de rol`);
  }

  const trasRes = await httpJsonAllowError(baseUrl, '/traslados?page=1&limit=5', { method: 'GET', token });
  if (!trasRes.ok) {
    console.warn(`[smoke] /traslados omitido (HTTP ${trasRes.status})`);
  }

  const asigRes = await httpJsonAllowError(
    baseUrl,
    '/asignaciones-tecnicos?page=1&limit=5',
    { method: 'GET', token },
  );
  if (!asigRes.ok) {
    console.warn(`[smoke] /asignaciones-tecnicos omitido (HTTP ${asigRes.status})`);
  }

  console.log('[smoke] OK — rutas críticas respondieron y hay bodega centro por sede');
}

main().catch((e: unknown) => {
  const err = e as { cause?: { code?: string }; code?: string; message?: string };
  if (err?.cause?.code === 'ECONNREFUSED' || err?.code === 'ECONNREFUSED') {
    console.error(
      '[smoke] No hay API en SMOKE_BASE_URL (conexión rechazada). Levanta el backend o exporta la URL correcta.',
    );
  }
  console.error(e);
  process.exit(1);
});
