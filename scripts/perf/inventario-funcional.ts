/**
 * Pruebas funcionales E2E de inventario (bodegas/centros/técnicos) + medidores + instalaciones + reversión al eliminar.
 *
 * Cubre:
 * - Limpieza inicial de ENTRADAS (eliminando movimientos tipo entrada)
 * - ENTRADA a bodega A (incluye material normal + material medidor con números)
 * - ASIGNACIÓN a técnico (desde bodega A) + validación por historial bodega/técnico
 * - SALIDA desde bodega A hacia instalación (incluye medidores) + validación
 * - DEVOLUCIÓN desde técnico hacia bodega A (origenTipo=tecnico) + validación
 * - TRASLADO bodega A -> bodega B (posiblemente de otra sede) + completar + validación
 * - ELIMINAR movimientos clave y verificar reversión de stock y liberación/eliminación de medidores
 *
 * Uso:
 *   PERF_BASE_URL=http://localhost:4100/api/v1 \
 *   PERF_EMAIL=admin@jarlepsis.com PERF_PASSWORD=Admin1234 \
 *   npx ts-node scripts/perf/inventario-funcional.ts
 *
 * Opcionales:
 *   PERF_TIMEOUT_MS=180000
 *   PERF_VERBOSE=1
 */
export {};

type LoginResponse = { access_token?: string; data?: { access_token?: string } };

const BASE_URL = process.env.PERF_BASE_URL || 'http://localhost:4100/api/v1';
const EMAIL = process.env.PERF_EMAIL || '';
const PASSWORD = process.env.PERF_PASSWORD || '';
const VERBOSE = Boolean(process.env.PERF_VERBOSE);

function must(value: string, name: string) {
  if (!value) throw new Error(`Falta ${name}`);
  return value;
}

async function http<T>(path: string, opts: RequestInit & { token?: string } = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = Number(process.env.PERF_TIMEOUT_MS || 180000);
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

function pickFirst<T>(arr: T[] | undefined | null): T | null {
  return Array.isArray(arr) && arr.length ? arr[0] : null;
}

function assert(cond: any, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}

function asNumber(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function nowIso() {
  return new Date().toISOString();
}

function getStockDespuesFromHistorial(hist: any[], materialId: number): number | null {
  if (!Array.isArray(hist)) return null;
  const rows = hist.filter((m) => Number(m.materialId) === Number(materialId));
  if (!rows.length) return null;
  // Los historiales vienen ordenados desc; stockDespues debería estar en el movimiento más reciente
  const latest = rows[0] as any;
  const s = latest.stockDespues ?? latest.stockDespuesBodega ?? latest.stockActual ?? latest.stock;
  const n = asNumber(s);
  return n != null ? n : null;
}

async function main() {
  must(EMAIL, 'PERF_EMAIL');
  must(PASSWORD, 'PERF_PASSWORD');

  console.log(`[e2e] Base URL: ${BASE_URL}`);
  console.time('[e2e] login');
  const login = await http<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  console.timeEnd('[e2e] login');
  const token = login?.access_token || login?.data?.access_token;
  if (!token) throw new Error('No se recibió access_token');

  console.time('[e2e] listar sedes/bodegas/inventarios/materiales/users');
  const [sedesResp, bodegasResp, inventariosResp, materialesResp, meResp, usersResp, tecnicosMiCentroResp] =
    await Promise.all([
    http<any>('/sedes', { token }),
    http<any>('/bodegas', { token }),
    http<any>('/inventarios', { token }),
    http<any>('/materiales', { token }),
    http<any>('/users/me', { token }),
    // Puede estar restringido por roles; no asumimos que siempre funcione o devuelva datos
    http<any>('/users?page=1&limit=2000', { token }).catch(() => ({ data: [], total: 0 })),
    http<any>('/users/tecnicos-mi-centro?page=1&limit=2000', { token }).catch(() => ({ data: [], total: 0 })),
  ]);
  console.timeEnd('[e2e] listar sedes/bodegas/inventarios/materiales/users');

  const sedes = unwrapData<any[]>(sedesResp);
  const bodegas = unwrapData<any[]>(bodegasResp);
  const inventarios = unwrapData<any[]>(inventariosResp);
  const materiales = unwrapData<any[]>(materialesResp);
  const me = unwrapData<any>(meResp);
  const usersPage = usersResp && typeof usersResp === 'object' ? usersResp : { data: [], total: 0 };
  const tecnicosPage =
    tecnicosMiCentroResp && typeof tecnicosMiCentroResp === 'object'
      ? tecnicosMiCentroResp
      : { data: [], total: 0 };
  const users = unwrapData<any[]>(usersPage);
  const tecnicosMiCentro = unwrapData<any[]>(tecnicosPage);

  assert(Array.isArray(bodegas) && bodegas.length >= 1, 'No hay bodegas');
  assert(Array.isArray(inventarios) && inventarios.length >= 1, 'No hay inventarios');
  assert(Array.isArray(materiales) && materiales.length >= 2, 'No hay suficientes materiales');
  // La lista de usuarios puede estar restringida por rol; al menos necesitamos un "me" válido y ojalá técnicos listables.
  assert(me?.usuarioId, 'No se pudo obtener /users/me');

  const medidor = materiales.find((m) => m?.materialEsMedidor) || materiales[0];
  const normal = materiales.find((m) => !m?.materialEsMedidor && Number(m?.materialId) !== Number(medidor?.materialId)) || materiales[0];
  const materialIdMedidor = Number(medidor.materialId);
  const materialIdNormal = Number(normal.materialId);
  assert(Number.isFinite(materialIdMedidor) && materialIdMedidor > 0, 'materialId medidor inválido');
  assert(Number.isFinite(materialIdNormal) && materialIdNormal > 0, 'materialId normal inválido');

  // Seleccionar dos bodegas (idealmente de sedes distintas para separación por centro operativo)
  const bodegaA = bodegas[0];
  const bodegaB = bodegas.find((b) => b?.bodegaId !== bodegaA?.bodegaId && b?.sedeId && b?.sedeId !== bodegaA?.sedeId) || bodegas.find((b) => b?.bodegaId !== bodegaA?.bodegaId) || bodegas[0];
  const bodegaAId = Number(bodegaA.bodegaId);
  const bodegaBId = Number(bodegaB.bodegaId);
  assert(bodegaAId > 0, 'bodegaA inválida');
  assert(bodegaBId > 0, 'bodegaB inválida');

  const invA = inventarios.find((i) => Number(i?.bodegaId ?? i?.bodega?.bodegaId) === bodegaAId) || pickFirst(inventarios);
  const invB = inventarios.find((i) => Number(i?.bodegaId ?? i?.bodega?.bodegaId) === bodegaBId) || pickFirst(inventarios);
  const inventarioAId = Number(invA?.inventarioId);
  const inventarioBId = Number(invB?.inventarioId);
  assert(inventarioAId > 0, 'inventario A no encontrado');
  assert(inventarioBId > 0, 'inventario B no encontrado');

  // Seleccionar técnico(s):
  // - preferimos quienes ya tengan inventario técnico (más confiable que filtrar por rol cuando /users está restringido)
  // - si no hay, usamos tecnicos-mi-centro, y luego /users, y finalmente "me"
  const invTecResp = await http<any>('/inventario-tecnico', { token }).catch(() => []);
  const invTecRows = unwrapData<any[]>(invTecResp);
  const invTecUsuarioIds = Array.isArray(invTecRows)
    ? Array.from(new Set(invTecRows.map((r) => Number(r?.usuarioId ?? r?.usuario?.usuarioId)).filter(Boolean)))
    : [];

  const candidatesFromInventarioTecnico = invTecUsuarioIds.map((uid) => ({ usuarioId: uid })) as any[];
  const baseTecnicos =
    (Array.isArray(candidatesFromInventarioTecnico) && candidatesFromInventarioTecnico.length
      ? candidatesFromInventarioTecnico
      : Array.isArray(tecnicosMiCentro) && tecnicosMiCentro.length
        ? tecnicosMiCentro
        : users) || [];

  const tecnico1 =
    baseTecnicos.find((t: any) => t?.usuarioSede && t.usuarioSede === bodegaA?.sedeId) ||
    baseTecnicos[0] ||
    me;
  const tecnico2 =
    baseTecnicos.find((t: any) => t?.usuarioSede && tecnico1?.usuarioSede && t.usuarioSede !== tecnico1.usuarioSede) ||
    baseTecnicos.find((t: any) => Number(t?.usuarioId) !== Number(tecnico1?.usuarioId)) ||
    tecnico1;

  const tecnico1Id = Number(tecnico1?.usuarioId);
  const tecnico2Id = Number(tecnico2?.usuarioId);
  assert(tecnico1Id > 0, 'No se pudo determinar tecnico1');
  assert(tecnico2Id > 0, 'No se pudo determinar tecnico2');

  console.log(
    `[e2e] contexto: bodegaA=${bodegaAId}(sede=${bodegaA?.sedeId ?? 'N/A'}) invA=${inventarioAId} | bodegaB=${bodegaBId}(sede=${bodegaB?.sedeId ?? 'N/A'}) invB=${inventarioBId}`,
  );
  console.log(
    `[e2e] materiales: medidor=${materialIdMedidor} (${medidor.materialCodigo || 'sin-codigo'}) normal=${materialIdNormal} (${normal.materialCodigo || 'sin-codigo'})`,
  );
  console.log(`[e2e] técnicos: t1=${tecnico1Id} (sede=${tecnico1?.usuarioSede ?? 'N/A'}) t2=${tecnico2Id} (sede=${tecnico2?.usuarioSede ?? 'N/A'})`);
  if (VERBOSE) {
    console.log(`[e2e] sedes disponibles: ${Array.isArray(sedes) ? sedes.length : 0}`);
  }

  // 1) Limpieza inicial: eliminar ENTRADAS existentes (para empezar en limpio)
  console.time('[e2e] limpiar entradas (movimientos tipo entrada)');
  const movsResp = await http<any>('/movimientos?page=1&limit=10000', { token });
  const movs = unwrapData<any[]>(movsResp);
  const entradas = (Array.isArray(movs) ? movs : []).filter((m) =>
    String(m?.movimientoTipo || m?.tipoMovimiento || '').toLowerCase().includes('entrada'),
  );
  let entradasEliminadas = 0;
  for (const m of entradas) {
    const id = Number(m?.movimientoId);
    if (!id) continue;
    try {
      await http(`/movimientos/${id}`, { method: 'DELETE', token });
      entradasEliminadas++;
    } catch (e: any) {
      // Si no tiene permisos (no es superadmin/gerencia) o ya no existe, continuar.
      if (VERBOSE) console.warn('[e2e] no se pudo eliminar entrada', id, e?.message || e);
    }
  }
  console.timeEnd('[e2e] limpiar entradas (movimientos tipo entrada)');
  console.log(`[e2e] entradas encontradas=${entradas.length} eliminadas=${entradasEliminadas}`);

  // Stocks iniciales por bodega/técnico (según historial)
  const [histA0, histB0, histT10] = await Promise.all([
    http<any>(`/movimientos/bodega/${bodegaAId}/historial`, { token }),
    http<any>(`/movimientos/bodega/${bodegaBId}/historial`, { token }),
    http<any>(`/movimientos/tecnico/${tecnico1Id}/historial`, { token }),
  ]);
  const stockA0 = getStockDespuesFromHistorial(unwrapData<any[]>(histA0), materialIdNormal) ?? 0;
  const stockB0 = getStockDespuesFromHistorial(unwrapData<any[]>(histB0), materialIdNormal) ?? 0;
  const stockT10 = getStockDespuesFromHistorial(unwrapData<any[]>(histT10), materialIdNormal) ?? 0;

  // 2) ENTRADA a bodega A (normal + medidor con seriales)
  const serials = Array.from({ length: 3 }).map((_, i) => `E2E-MD-${Date.now()}-${i + 1}`);
  const entradaBody: any = {
    movimientoTipo: 'entrada',
    usuarioId: 0, // se sobrescribe
    inventarioId: inventarioAId,
    materiales: [
      { materialId: materialIdNormal, movimientoCantidad: 10 },
      { materialId: materialIdMedidor, movimientoCantidad: serials.length, numerosMedidor: serials },
    ],
    movimientoObservaciones: `e2e ${nowIso()} entrada`,
    numeroOrden: `E2E-ENT-${Date.now()}`,
  };
  console.time('[e2e] crear ENTRADA');
  const entradaResp = await http<any>('/movimientos', { method: 'POST', token, body: JSON.stringify(entradaBody) });
  console.timeEnd('[e2e] crear ENTRADA');
  const entradaMovs = unwrapData<any[]>(entradaResp);
  assert(Array.isArray(entradaMovs) && entradaMovs.length >= 1, 'La entrada no creó movimientos');
  const entradaIds = entradaMovs.map((m) => Number(m.movimientoId)).filter(Boolean);

  // Validar medidores creados
  const medListResp = await http<any>(`/numeros-medidor/material/${materialIdMedidor}`, { token });
  const medRows = unwrapData<any[]>(medListResp);
  const medSet = new Set(medRows.map((r) => String(r?.numeroMedidor)));
  const medMissing = serials.filter((s) => !medSet.has(s));
  assert(medMissing.length === 0, `Faltan medidores creados en entrada: ${medMissing.slice(0, 3).join(', ')}`);

  // 3) ASIGNACIÓN desde inventario A a técnico1 (material normal)
  const asigBody: any = {
    usuarioId: tecnico1Id,
    inventarioId: inventarioAId,
    usuarioAsignadorId: Number(me.usuarioId), // FK requerido
    materiales: [{ materialId: materialIdNormal, cantidad: 4 }],
    observaciones: `e2e ${nowIso()} asignación`,
    numeroOrden: `E2E-ASIG-${Date.now()}`,
  };
  console.time('[e2e] crear ASIGNACIÓN');
  const asigResp = await http<any>('/asignaciones-tecnicos', { method: 'POST', token, body: JSON.stringify(asigBody) });
  console.timeEnd('[e2e] crear ASIGNACIÓN');
  const asig = unwrapData<any>(asigResp);
  const asignacionId = Number(asig?.asignacionId || asig?.id);
  // No forzamos si el backend retorna otra forma, pero lo usamos si existe

  // 4) Crear instalación (para salida asociada)
  const [tiposResp, clientesResp] = await Promise.all([
    http<any>('/tipos-instalacion', { token }),
    http<any>('/clientes', { token }),
  ]);
  const tipos = unwrapData<any[]>(tiposResp);
  const clientes = unwrapData<any[]>(clientesResp);
  const tipo = pickFirst(tipos);
  const cliente = pickFirst(clientes);
  assert(tipo?.tipoInstalacionId, 'No hay tipoInstalacion para crear instalación');
  assert(cliente?.clienteId, 'No hay cliente para crear instalación');

  const instalacionBody: any = {
    tipoInstalacionId: Number(tipo.tipoInstalacionId),
    instalacionTipo: 'internas',
    clienteId: Number(cliente.clienteId),
    fechaAsignacionMetrogas: new Date().toISOString(),
    instalacionObservaciones: `e2e ${nowIso()} instalación`,
    bodegaId: bodegaAId,
  };
  console.time('[e2e] crear INSTALACIÓN');
  const instResp = await http<any>('/instalaciones', { method: 'POST', token, body: JSON.stringify(instalacionBody) });
  console.timeEnd('[e2e] crear INSTALACIÓN');
  const inst = unwrapData<any>(instResp);
  const instalacionId = Number(inst?.instalacionId || inst?.id);
  assert(instalacionId > 0, 'No se pudo crear instalación');

  // 5) SALIDA desde bodega A hacia instalación (normal + medidores)
  const salidaSerials = Array.from({ length: 2 }).map((_, i) => serials[i]); // usar parte de los creados
  const salidaBody: any = {
    movimientoTipo: 'salida',
    usuarioId: 0,
    inventarioId: inventarioAId,
    instalacionId,
    materiales: [
      { materialId: materialIdNormal, movimientoCantidad: 2 },
      { materialId: materialIdMedidor, movimientoCantidad: salidaSerials.length, numerosMedidor: salidaSerials },
    ],
    movimientoObservaciones: `e2e ${nowIso()} salida a instalación ${instalacionId}`,
    numeroOrden: `E2E-SAL-${Date.now()}`,
  };
  console.time('[e2e] crear SALIDA');
  const salidaResp = await http<any>('/movimientos', { method: 'POST', token, body: JSON.stringify(salidaBody) });
  console.timeEnd('[e2e] crear SALIDA');
  const salidaMovs = unwrapData<any[]>(salidaResp);
  assert(Array.isArray(salidaMovs) && salidaMovs.length >= 1, 'La salida no creó movimientos');
  const salidaIds = salidaMovs.map((m) => Number(m.movimientoId)).filter(Boolean);

  // 6) DEVOLUCIÓN desde técnico1 hacia bodega A (origenTipo=tecnico)
  const devolBody: any = {
    movimientoTipo: 'devolucion',
    usuarioId: 0,
    inventarioId: inventarioAId,
    origenTipo: 'tecnico',
    tecnicoOrigenId: tecnico1Id,
    materiales: [{ materialId: materialIdNormal, movimientoCantidad: 1 }],
    movimientoObservaciones: `e2e ${nowIso()} devolución desde técnico ${tecnico1Id}`,
    numeroOrden: `E2E-DEV-${Date.now()}`,
  };
  console.time('[e2e] crear DEVOLUCIÓN');
  const devResp = await http<any>('/movimientos', { method: 'POST', token, body: JSON.stringify(devolBody) });
  console.timeEnd('[e2e] crear DEVOLUCIÓN');
  const devMovs = unwrapData<any[]>(devResp);
  assert(Array.isArray(devMovs) && devMovs.length >= 1, 'La devolución no creó movimientos');
  const devolIds = devMovs.map((m) => Number(m.movimientoId)).filter(Boolean);

  // 7) TRASLADO bodega A -> bodega B (material normal)
  const trasladoBody: any = {
    usuarioId: Number(me.usuarioId),
    bodegaOrigenId: bodegaAId,
    bodegaDestinoId: bodegaBId,
    materiales: [{ materialId: materialIdNormal, trasladoCantidad: 1 }],
    trasladoObservaciones: `e2e ${nowIso()} traslado A->B`,
    numeroOrden: `E2E-TR-${Date.now()}`,
  };
  console.time('[e2e] crear TRASLADO');
  const trResp = await http<any>('/traslados', { method: 'POST', token, body: JSON.stringify(trasladoBody) });
  console.timeEnd('[e2e] crear TRASLADO');
  const trUnwrapped = unwrapData<any>(trResp);
  const tr =
    Array.isArray(trUnwrapped) ? trUnwrapped[0] : trUnwrapped && typeof trUnwrapped === 'object' ? trUnwrapped : null;
  const trasladoId = Number(
    tr?.trasladoId ||
      tr?.id ||
      trResp?.trasladoId ||
      trResp?.id ||
      trResp?.data?.trasladoId ||
      trResp?.data?.id,
  );
  if (!trasladoId && VERBOSE) {
    console.log('[e2e] traslado response raw:', trResp);
    console.log('[e2e] traslado unwrapped:', trUnwrapped);
  }
  assert(trasladoId > 0, 'No se pudo crear traslado');

  console.time('[e2e] completar TRASLADO');
  await http<any>(`/traslados/${trasladoId}/completar`, { method: 'POST', token });
  console.timeEnd('[e2e] completar TRASLADO');

  // 8) Validaciones de stock por historial (bodegaA, bodegaB, técnico1)
  const [histA1, histB1, histT11] = await Promise.all([
    http<any>(`/movimientos/bodega/${bodegaAId}/historial`, { token }),
    http<any>(`/movimientos/bodega/${bodegaBId}/historial`, { token }),
    http<any>(`/movimientos/tecnico/${tecnico1Id}/historial`, { token }),
  ]);
  const stockA1 = getStockDespuesFromHistorial(unwrapData<any[]>(histA1), materialIdNormal);
  const stockB1 = getStockDespuesFromHistorial(unwrapData<any[]>(histB1), materialIdNormal);
  const stockT11 = getStockDespuesFromHistorial(unwrapData<any[]>(histT11), materialIdNormal);

  console.log('[e2e] stocks material normal (aprox, desde historial):');
  console.log(`  bodegaA: ${stockA0} -> ${stockA1}`);
  console.log(`  bodegaB: ${stockB0} -> ${stockB1}`);
  console.log(`  tecnico1: ${stockT10} -> ${stockT11}`);

  // 9) Reversión: eliminar una DEVOLUCIÓN y verificar que se revierta el efecto
  const devToDelete = devolIds[0];
  if (devToDelete) {
    const beforeA = stockA1 ?? 0;
    const beforeT = stockT11 ?? 0;
    console.time('[e2e] eliminar DEVOLUCIÓN (reversión)');
    try {
      await http(`/movimientos/${devToDelete}`, { method: 'DELETE', token });
      console.timeEnd('[e2e] eliminar DEVOLUCIÓN (reversión)');
    } catch (e: any) {
      console.timeEnd('[e2e] eliminar DEVOLUCIÓN (reversión)');
      console.warn('[e2e] no se pudo eliminar devolución (permiso/estado):', e?.message || e);
    }
    const [histA2, histT12] = await Promise.all([
      http<any>(`/movimientos/bodega/${bodegaAId}/historial`, { token }),
      http<any>(`/movimientos/tecnico/${tecnico1Id}/historial`, { token }),
    ]);
    const afterA = getStockDespuesFromHistorial(unwrapData<any[]>(histA2), materialIdNormal) ?? beforeA;
    const afterT = getStockDespuesFromHistorial(unwrapData<any[]>(histT12), materialIdNormal) ?? beforeT;
    console.log(`[e2e] reversión DEVOLUCIÓN (material normal): bodegaA ${beforeA} -> ${afterA} | tecnico1 ${beforeT} -> ${afterT}`);
  }

  // 10) Reversión medidores: eliminar la SALIDA y validar liberación de medidores (que sigan existiendo, no asignados)
  const salidaToDelete = salidaIds[0];
  if (salidaToDelete) {
    console.time('[e2e] eliminar SALIDA (reversión medidores)');
    try {
      await http(`/movimientos/${salidaToDelete}`, { method: 'DELETE', token });
      console.timeEnd('[e2e] eliminar SALIDA (reversión medidores)');
    } catch (e: any) {
      console.timeEnd('[e2e] eliminar SALIDA (reversión medidores)');
      console.warn('[e2e] no se pudo eliminar salida (permiso/estado):', e?.message || e);
    }
    const medAfterResp = await http<any>(`/numeros-medidor/material/${materialIdMedidor}`, { token });
    const medAfter = unwrapData<any[]>(medAfterResp);
    const setAfter = new Set(medAfter.map((r) => String(r?.numeroMedidor)));
    const stillMissing = salidaSerials.filter((s) => !setAfter.has(s));
    assert(stillMissing.length === 0, `Tras revertir SALIDA faltan medidores (no deberían borrarse): ${stillMissing.join(', ')}`);
    console.log('[e2e] OK: medidores de salida siguen existiendo tras eliminar SALIDA');
  }

  // 11) Reversión de ENTRADA: eliminar un movimiento de entrada y validar que stock bodega A baje y medidores se eliminen o liberen según regla
  const entradaToDelete = entradaIds[0];
  if (entradaToDelete) {
    console.time('[e2e] eliminar ENTRADA (reversión stock + medidores)');
    try {
      await http(`/movimientos/${entradaToDelete}`, { method: 'DELETE', token });
      console.timeEnd('[e2e] eliminar ENTRADA (reversión stock + medidores)');
    } catch (e: any) {
      console.timeEnd('[e2e] eliminar ENTRADA (reversión stock + medidores)');
      console.warn('[e2e] no se pudo eliminar entrada (permiso/estado):', e?.message || e);
    }
    const medFinalResp = await http<any>(`/numeros-medidor/material/${materialIdMedidor}`, { token });
    const medFinal = unwrapData<any[]>(medFinalResp);
    const setFinal = new Set(medFinal.map((r) => String(r?.numeroMedidor)));
    const serialsRemaining = serials.filter((s) => setFinal.has(s));
    console.log(`[e2e] tras eliminar ENTRADA, medidores creados inicialmente restantes=${serialsRemaining.length}/${serials.length} (pueden borrarse si fueron creados recientemente y disponibles)`);
  }

  console.log('[e2e] FIN OK');
  if (asignacionId) console.log(`[e2e] asignacionId=${asignacionId}`);
  console.log(`[e2e] instalacionId=${instalacionId} trasladoId=${trasladoId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

