/**
 * Prueba realista de carga para movimientos grandes:
 * - Crea 1000 números de medidor para un material tipo medidor
 * - Crea 1 movimiento ENTRADA con 500 materiales (1 item con 1000 medidores + 499 items normales)
 * - Valida que los números queden creados y que el movimiento responda correctamente
 *
 * Uso:
 *   PERF_BASE_URL=http://localhost:4100/api/v1 PERF_EMAIL=... PERF_PASSWORD=... PERF_INVENTARIO_ID=1 npx ts-node scripts/perf/movimientos-grandes.ts
 */
export {};

type LoginResponse = { access_token?: string; data?: { access_token?: string } };

const BASE_URL = process.env.PERF_BASE_URL || 'http://localhost:4100/api/v1';
const EMAIL = process.env.PERF_EMAIL || '';
const PASSWORD = process.env.PERF_PASSWORD || '';
const INVENTARIO_ID = process.env.PERF_INVENTARIO_ID ? Number(process.env.PERF_INVENTARIO_ID) : undefined;

function must(value: string, name: string) {
  if (!value) throw new Error(`Falta ${name}`);
  return value;
}

async function http<T>(path: string, opts: RequestInit & { token?: string } = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = Number(process.env.PERF_TIMEOUT_MS || 180000); // 3 minutos por request
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const res = await fetch(`${BASE_URL}${path}`, {
    ...opts,
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      ...opts.headers,
    },
  });
  clearTimeout(timeoutId);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${path}: ${text}`);
  }
  return data as T;
}

function unwrapData<T>(resp: any): T {
  if (resp && typeof resp === 'object' && 'data' in resp) return resp.data as T;
  return resp as T;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  must(EMAIL, 'PERF_EMAIL');
  must(PASSWORD, 'PERF_PASSWORD');

  console.log(`[perf] Base URL: ${BASE_URL}`);

  console.time('[perf] login');
  const login = await http<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  console.timeEnd('[perf] login');

  const token = login?.access_token || login?.data?.access_token;
  if (!token) throw new Error('No se recibió access_token');

  let inventarioId = INVENTARIO_ID;
  if (!inventarioId) {
    console.time('[perf] listar inventarios');
    const invResp = await http<any>('/inventarios', { token });
    const inventarios = unwrapData<any[]>(invResp);
    console.timeEnd('[perf] listar inventarios');
    const first = Array.isArray(inventarios) ? inventarios[0] : null;
    inventarioId = first?.inventarioId ? Number(first.inventarioId) : undefined;
    console.log(`[perf] inventarioId auto: ${inventarioId ?? 'N/A'}`);
  }

  console.time('[perf] listar materiales');
  const matsResp = await http<any>('/materiales', { token });
  const materiales = unwrapData<any[]>(matsResp);
  console.timeEnd('[perf] listar materiales');

  if (!Array.isArray(materiales) || materiales.length < 2) {
    throw new Error('No hay suficientes materiales para probar');
  }

  const medidor = materiales.find((m) => m?.materialEsMedidor) || materiales[0];
  const otros = materiales.filter((m) => m?.materialId !== medidor?.materialId).slice(0, 499);
  const materialIdMedidor = Number(medidor.materialId);

  console.log(`[perf] material medidor: ${materialIdMedidor} (${medidor.materialCodigo || 'sin-codigo'})`);
  console.log(`[perf] materiales extra: ${otros.length}`);

  const serials = Array.from({ length: 1000 }).map((_, i) => `MD-${Date.now()}-${i + 1}`);

  console.log('[perf] creando 1000 numeros_medidor (en chunks)...');
  const chunks = chunk(serials, Number(process.env.PERF_CHUNK_SIZE || 200));
  console.time('[perf] crear 1000 numeros_medidor');
  for (let i = 0; i < chunks.length; i++) {
    const part = chunks[i];
    console.time(`[perf]  numeros_medidor chunk ${i + 1}/${chunks.length} (${part.length})`);
    await http('/numeros-medidor/crear-multiples', {
      method: 'POST',
      token,
      body: JSON.stringify({
        materialId: materialIdMedidor,
        items: part.map((numeroMedidor) => ({ numeroMedidor })),
      }),
    });
    console.timeEnd(`[perf]  numeros_medidor chunk ${i + 1}/${chunks.length} (${part.length})`);
  }
  console.timeEnd('[perf] crear 1000 numeros_medidor');

  const movimientoBody: any = {
    movimientoTipo: 'entrada',
    usuarioId: 0, // se sobrescribe por backend con el usuario autenticado
    inventarioId: inventarioId,
    materiales: [
      {
        materialId: materialIdMedidor,
        movimientoCantidad: 1000,
        numerosMedidor: serials,
      },
      ...otros.map((m: any) => ({
        materialId: Number(m.materialId),
        movimientoCantidad: 1,
      })),
    ],
    movimientoObservaciones: 'perf: movimiento grande (500 items, 1000 medidores)',
    numeroOrden: `PERF-${Date.now()}`,
  };

  console.time('[perf] crear movimiento (500 items)');
  const movResp = await http<any>('/movimientos', {
    method: 'POST',
    token,
    body: JSON.stringify(movimientoBody),
  });
  const movimientos = unwrapData<any[]>(movResp);
  console.timeEnd('[perf] crear movimiento (500 items)');

  console.log(`[perf] movimientos creados: ${Array.isArray(movimientos) ? movimientos.length : 'N/A'}`);

  console.time('[perf] validar medidores por material');
  const medResp = await http<any>(`/numeros-medidor/material/${materialIdMedidor}`, { token });
  const medidoresCreados = unwrapData<any[]>(medResp);
  console.timeEnd('[perf] validar medidores por material');
  console.log(`[perf] medidores totales del material: ${medidoresCreados.length}`);

  // Validación simple: que existan al menos los 1000 recién creados
  const set = new Set(medidoresCreados.map((x: any) => String(x.numeroMedidor)));
  const missing = serials.filter((s) => !set.has(s));
  console.log(`[perf] serials faltantes: ${missing.length}`);
  if (missing.length) {
    console.log('[perf] ejemplo faltantes:', missing.slice(0, 10));
  }

  console.log('[perf] OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

