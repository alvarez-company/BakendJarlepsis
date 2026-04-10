import ds from '../src/config/typeorm.config';

type MovimientoRow = {
  movimientoId: number;
  movimientoTipo: string;
  usuarioId: number | null;
  inventarioId: number | null;
  fechaCreacion: string;
  numerosMedidor: any;
};

function parseNumerosMedidor(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return [];
    // Puede venir como JSON string (MySQL JSON) o como string simple
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map(String);
      if (typeof parsed === 'string') return [parsed];
      return [];
    } catch {
      // No es JSON válido: usar como un único número
      return [s];
    }
  }
  return [];
}

/**
 * Backfill de ubicación (bodegaId) para números de medidor "disponibles" que quedaron sin bodega.
 *
 * Estrategia (de mejor a peor señal):
 * 1) Si el número aparece en algún movimiento con inventarioId -> usar la bodega de ese inventario.
 *    - Preferir el movimiento más reciente que lo mencione.
 * 2) Si no hay inventarioId, usar el registro del usuario:
 *    - si usuario.usuarioBodega -> esa bodega
 *    - else si usuario.usuarioSede -> bodegaTipo='centro' de esa sede
 *
 * IMPORTANTE:
 * - Solo aplica a `numeros_medidor.estado='disponible'` y `bodegaId IS NULL` (y sin usuario/instalación).
 * - No toca medidores asignados a técnico o en instalación.
 */
async function main() {
  await ds.initialize();
  try {
    // Pre-cargar mapas necesarios
    const inventarios: Array<{ inventarioId: number; bodegaId: number }> = await ds.query(
      `SELECT inventarioId, bodegaId FROM inventarios`,
    );
    const inventarioToBodega = new Map<number, number>();
    for (const r of inventarios) inventarioToBodega.set(Number(r.inventarioId), Number(r.bodegaId));

    const bodegasCentro: Array<{ sedeId: number; bodegaId: number }> = await ds.query(
      `SELECT sedeId, bodegaId FROM bodegas WHERE bodegaTipo = 'centro' AND bodegaEstado = 1`,
    );
    const sedeToBodegaCentro = new Map<number, number>();
    for (const r of bodegasCentro) sedeToBodegaCentro.set(Number(r.sedeId), Number(r.bodegaId));

    const usuarios: Array<{ usuarioId: number; usuarioBodega: number | null; usuarioSede: number | null }> =
      await ds.query(`SELECT usuarioId, usuarioBodega, usuarioSede FROM usuarios`);
    const usuarioToBodega = new Map<number, number | null>();
    const usuarioToSede = new Map<number, number | null>();
    for (const u of usuarios) {
      usuarioToBodega.set(Number(u.usuarioId), u.usuarioBodega != null ? Number(u.usuarioBodega) : null);
      usuarioToSede.set(Number(u.usuarioId), u.usuarioSede != null ? Number(u.usuarioSede) : null);
    }

    // Cargar movimientos que contienen numerosMedidor (pueden ser muchos, pero es el mejor rastro)
    const movimientos: MovimientoRow[] = await ds.query(`
      SELECT movimientoId, movimientoTipo, usuarioId, inventarioId, fechaCreacion, numerosMedidor
      FROM movimientos_inventario
      WHERE numerosMedidor IS NOT NULL
    `);

    // Construir índice numero -> movimiento más reciente con inventarioId (o sin inventario como fallback)
    const idxConInventario = new Map<string, MovimientoRow>();
    const idxSinInventario = new Map<string, MovimientoRow>();

    for (const m of movimientos) {
      const arr = parseNumerosMedidor(m.numerosMedidor);
      if (arr.length === 0) continue;

      for (const n of arr) {
        const key = String(n).trim();
        if (!key) continue;
        if (m.inventarioId != null) {
          const prev = idxConInventario.get(key);
          if (!prev || new Date(m.fechaCreacion).getTime() > new Date(prev.fechaCreacion).getTime()) {
            idxConInventario.set(key, m);
          }
        } else {
          const prev = idxSinInventario.get(key);
          if (!prev || new Date(m.fechaCreacion).getTime() > new Date(prev.fechaCreacion).getTime()) {
            idxSinInventario.set(key, m);
          }
        }
      }
    }

    // Seleccionar candidatos a reparar
    const candidatos: Array<{ numeroMedidorId: number; numeroMedidor: string }> = await ds.query(`
      SELECT numeroMedidorId, numeroMedidor
      FROM numeros_medidor
      WHERE estado = 'disponible'
        AND bodegaId IS NULL
        AND (usuarioId IS NULL OR usuarioId = 0)
        AND (instalacionId IS NULL OR instalacionId = 0)
        AND (instalacionMaterialId IS NULL OR instalacionMaterialId = 0)
      LIMIT 20000
    `);

    let updated = 0;
    let skipped = 0;
    let sinPista = 0;

    const BATCH = 200;
    for (let i = 0; i < candidatos.length; i += BATCH) {
      const batch = candidatos.slice(i, i + BATCH);
      const updates: Array<{ id: number; bodegaId: number }> = [];

      for (const nm of batch) {
        const num = String(nm.numeroMedidor || '').trim();
        if (!num) {
          skipped++;
          continue;
        }

        // 1) Movimiento con inventarioId
        const mov = idxConInventario.get(num);
        if (mov?.inventarioId != null) {
          const bodegaId = inventarioToBodega.get(Number(mov.inventarioId));
          if (bodegaId != null) {
            updates.push({ id: Number(nm.numeroMedidorId), bodegaId: Number(bodegaId) });
            continue;
          }
        }

        // 2) Movimiento sin inventario: usar contexto del usuario que lo registró (si existe)
        const mov2 = idxSinInventario.get(num);
        const usuarioId = mov2?.usuarioId != null ? Number(mov2.usuarioId) : null;
        if (usuarioId != null) {
          const bodegaUsuario = usuarioToBodega.get(usuarioId) ?? null;
          if (bodegaUsuario != null && bodegaUsuario > 0) {
            updates.push({ id: Number(nm.numeroMedidorId), bodegaId: Number(bodegaUsuario) });
            continue;
          }
          const sede = usuarioToSede.get(usuarioId) ?? null;
          if (sede != null && sede > 0) {
            const bodegaCentro = sedeToBodegaCentro.get(sede);
            if (bodegaCentro != null) {
              updates.push({ id: Number(nm.numeroMedidorId), bodegaId: Number(bodegaCentro) });
              continue;
            }
          }
        }

        sinPista++;
      }

      if (updates.length > 0) {
        // UPDATE masivo por CASE
        const ids = updates.map((u) => u.id);
        const cases = updates.map((u) => `WHEN ${u.id} THEN ${u.bodegaId}`).join(' ');
        await ds.query(`
          UPDATE numeros_medidor
          SET bodegaId = CASE numeroMedidorId ${cases} ELSE bodegaId END
          WHERE numeroMedidorId IN (${ids.join(',')})
        `);
        updated += updates.length;
      }
    }

    // Recalcular materialStock otra vez (por si la UI depende de stock agregado)
    await ds.query(`
      UPDATE materiales m
      LEFT JOIN (
        SELECT materialId, COALESCE(SUM(stock), 0) AS stockBodegas
        FROM materiales_bodegas
        GROUP BY materialId
      ) mb ON mb.materialId = m.materialId
      LEFT JOIN (
        SELECT materialId, COALESCE(SUM(cantidad), 0) AS stockTecnicos
        FROM inventario_tecnicos
        GROUP BY materialId
      ) it ON it.materialId = m.materialId
      SET m.materialStock = COALESCE(mb.stockBodegas, 0) + COALESCE(it.stockTecnicos, 0)
    `);

    // eslint-disable-next-line no-console
    console.log(
      `[reconcile-medidores-ubicacion] candidatos=${candidatos.length} updated=${updated} skipped=${skipped} sinPista=${sinPista}`,
    );
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('[reconcile-medidores-ubicacion] ERROR', e);
  process.exitCode = 1;
});

