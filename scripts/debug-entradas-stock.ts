import 'dotenv/config';
import * as mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';

type MovimientoRow = RowDataPacket & {
  movimientoId: number;
  movimientoTipo: string;
  movimientoCantidad: string | number;
  inventarioId: number | null;
  materialId: number;
  movimientoEstado: string | null;
  fechaCreacion: string;
};

async function main() {
  const host = process.env.DB_HOST ?? '127.0.0.1';
  const port = Number(process.env.DB_PORT ?? 3306);
  const user = process.env.DB_USERNAME ?? 'root';
  const password = process.env.DB_PASSWORD ?? '';
  const database = process.env.DB_NAME ?? 'jarlepsisdev';

  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    timezone: 'Z',
  });

  try {
    const [movs] = await conn.query<MovimientoRow[]>(
      `
      SELECT 
        movimientoId,
        movimientoTipo,
        movimientoCantidad,
        inventarioId,
        materialId,
        movimientoEstado,
        fechaCreacion
      FROM movimientos_inventario
      WHERE LOWER(movimientoTipo) = 'entrada'
      ORDER BY movimientoId DESC
      LIMIT 20
      `,
    );

    if (!movs.length) {
      console.log('No hay movimientos tipo ENTRADA.');
      return;
    }

    console.log('Últimas 20 ENTRADAS (movimiento_inventario):');
    for (const m of movs) {
      console.log(
        `- movId=${m.movimientoId} matId=${m.materialId} invId=${m.inventarioId} cant=${m.movimientoCantidad} estado=${m.movimientoEstado} fecha=${m.fechaCreacion}`,
      );
    }

    const inventarioIds = Array.from(
      new Set(movs.map((m) => (m.inventarioId != null ? Number(m.inventarioId) : null)).filter((x) => x != null)),
    ) as number[];

    const invById = new Map<number, { inventarioId: number; bodegaId: number }>();
    if (inventarioIds.length) {
      const [invs] = await conn.query<Array<RowDataPacket & { inventarioId: number; bodegaId: number }>>(
        `
        SELECT inventarioId, bodegaId
        FROM inventarios
        WHERE inventarioId IN (${inventarioIds.map(() => '?').join(',')})
        `,
        inventarioIds,
      );
      for (const inv of invs) invById.set(Number(inv.inventarioId), { inventarioId: inv.inventarioId, bodegaId: inv.bodegaId });
    }

    console.log('\nChequeo de stock en materiales_bodegas para esas entradas:');
    for (const m of movs) {
      const invId = m.inventarioId != null ? Number(m.inventarioId) : null;
      const inv = invId != null ? invById.get(invId) : undefined;
      const bodegaId = inv?.bodegaId ?? null;
      if (!bodegaId) {
        console.log(`- movId=${m.movimientoId}: invId=${invId} -> bodegaId=null (no se puede reflejar en bodega)`);
        continue;
      }
      const materialId = Number(m.materialId);
      const [rows] = await conn.query<Array<RowDataPacket & { stock: string | number }>>(
        `
        SELECT stock
        FROM materiales_bodegas
        WHERE materialId = ? AND bodegaId = ?
        LIMIT 1
        `,
        [materialId, bodegaId],
      );
      const stock = rows.length ? rows[0].stock : null;
      console.log(
        `- movId=${m.movimientoId}: matId=${materialId} bodegaId=${bodegaId} -> materiales_bodegas.stock=${stock ?? 'NO_ROW'}`,
      );
    }
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error('Error debug-entradas-stock:', e);
  process.exit(1);
});

