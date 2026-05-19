import 'dotenv/config';
import * as mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';

type Row = RowDataPacket & {
  materialId: number;
  bodegaId: number;
  stock: string | number;
};

function asNumber(x: any) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

async function main() {
  const apply = process.argv.includes('--apply');

  const host = process.env.DB_HOST ?? '127.0.0.1';
  const port = Number(process.env.DB_PORT ?? 3306);
  const user = process.env.DB_USERNAME ?? 'root';
  const password = process.env.DB_PASSWORD ?? '';
  const database = process.env.DB_NAME ?? 'jarlepsisdev';

  const conn = await mysql.createConnection({ host, port, user, password, database, timezone: 'Z' });

  try {
    // Recalcular stock por material + bodega desde movimientos completados.
    // Compat legacy: movimientoEstado=1 se considera "completada".
    // Regla de negocio actual (ver MovimientosService.ajustarStockMovimiento):
    // - entrada   => +cantidad
    // - salida    => -cantidad
    // - devolucion=> -cantidad
    const [rows] = await conn.query<Row[]>(
      `
      SELECT
        mi.materialId AS materialId,
        i.bodegaId AS bodegaId,
        SUM(
          CASE LOWER(mi.movimientoTipo)
            WHEN 'entrada' THEN mi.movimientoCantidad
            WHEN 'salida' THEN -mi.movimientoCantidad
            WHEN 'devolucion' THEN -mi.movimientoCantidad
            ELSE 0
          END
        ) AS stock
      FROM movimientos_inventario mi
      INNER JOIN inventarios i ON i.inventarioId = mi.inventarioId
      WHERE mi.inventarioId IS NOT NULL
        AND (mi.movimientoEstado = 1 OR LOWER(COALESCE(mi.movimientoEstado, '')) = 'completada')
      GROUP BY mi.materialId, i.bodegaId
      `,
    );

    const computed = rows
      .map((r) => ({
        materialId: Number(r.materialId),
        bodegaId: Number(r.bodegaId),
        stock: asNumber(r.stock),
      }))
      .filter((r) => r.materialId > 0 && r.bodegaId > 0);

    const negativos = computed.filter((r) => r.stock < 0).slice(0, 20);
    if (negativos.length) {
      console.warn(
        `[rebuild-materiales-bodegas] Advertencia: hay stocks negativos (muestra 20). No se aplicará clamp automático:`,
      );
      for (const n of negativos) {
        console.warn(`- materialId=${n.materialId} bodegaId=${n.bodegaId} stock=${n.stock}`);
      }
    }

    console.log(`[rebuild-materiales-bodegas] Filas calculadas: ${computed.length}`);
    console.log(
      `[rebuild-materiales-bodegas] Modo: ${apply ? 'APLICAR (upsert materiales_bodegas)' : 'DRY-RUN'}`,
    );

    if (!apply) return;

    const materialIds = [...new Set(computed.map((r) => r.materialId))];
    if (materialIds.length > 0) {
      const placeholders = materialIds.map(() => '?').join(',');
      await conn.query(
        `DELETE FROM materiales_bodegas WHERE materialId IN (${placeholders})`,
        materialIds,
      );
    }

    for (const r of computed) {
      if (r.stock === 0) continue;
      await conn.query(
        `
        INSERT INTO materiales_bodegas (materialId, bodegaId, stock)
        VALUES (?, ?, ?)
        `,
        [r.materialId, r.bodegaId, r.stock],
      );
    }

    if (materialIds.length > 0) {
      const ph = materialIds.map(() => '?').join(',');
      await conn.query(
        `
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
      WHERE m.materialId IN (${ph})
    `,
        materialIds,
      );
    }

    console.log('[rebuild-materiales-bodegas] OK (materiales_bodegas + materialStock sincronizados)');
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error('[rebuild-materiales-bodegas] ERROR', e);
  process.exit(1);
});

