import ds from '../src/config/typeorm.config';

/**
 * Asigna SOLO materiales con stock "huérfano" (materialStock>0) que no tienen distribución:
 * - No existen filas en materiales_bodegas para ese material
 * - No existen filas en inventario_tecnicos para ese material
 *
 * Se asigna el stock completo a:
 * - la bodega del usuario que registró el material (`materiales.usuarioRegistra` -> usuarios.usuarioBodega)
 * - o al centro operativo del usuario (`usuarios.usuarioSede` -> bodegaTipo='centro' de esa sede)
 *
 * Nota: esto NO toca materiales que ya tengan distribución (bodegas/técnicos).
 */
async function main() {
  await ds.initialize();
  try {
    const bodegasCentro: Array<{ sedeId: number; bodegaId: number }> = await ds.query(
      `SELECT sedeId, bodegaId FROM bodegas WHERE bodegaTipo='centro' AND bodegaEstado=1`,
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

    const candidatos: Array<{ materialId: number; materialStock: string; usuarioRegistra: number | null }> =
      await ds.query(`
      SELECT m.materialId, m.materialStock, m.usuarioRegistra
      FROM materiales m
      WHERE COALESCE(m.materialStock, 0) > 0
        AND NOT EXISTS (SELECT 1 FROM materiales_bodegas mb WHERE mb.materialId = m.materialId)
        AND NOT EXISTS (SELECT 1 FROM inventario_tecnicos it WHERE it.materialId = m.materialId)
      LIMIT 50000
    `);

    let inserted = 0;
    let sinPista = 0;

    for (const m of candidatos) {
      const stock = Number(m.materialStock || 0);
      if (!(stock > 0)) continue;
      const u = m.usuarioRegistra != null ? Number(m.usuarioRegistra) : null;
      if (u == null) {
        sinPista++;
        continue;
      }

      let bodegaId: number | null = null;
      const bU = usuarioToBodega.get(u) ?? null;
      if (bU != null && bU > 0) {
        bodegaId = Number(bU);
      } else {
        const sede = usuarioToSede.get(u) ?? null;
        if (sede != null && sede > 0) {
          const bCentro = sedeToBodegaCentro.get(Number(sede));
          if (bCentro != null) bodegaId = Number(bCentro);
        }
      }

      if (bodegaId == null) {
        sinPista++;
        continue;
      }

      await ds.query(
        `INSERT INTO materiales_bodegas (materialId, bodegaId, stock, precioPromedio)
         VALUES (?, ?, ?, NULL)
         ON DUPLICATE KEY UPDATE stock = stock`,
        [Number(m.materialId), bodegaId, stock],
      );
      inserted++;
    }

    // Recalcular materialStock (consistente con distribución)
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
      `[reconcile-materiales-huerfanos] candidatos=${candidatos.length} inserted=${inserted} sinPista=${sinPista}`,
    );
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('[reconcile-materiales-huerfanos] ERROR', e);
  process.exitCode = 1;
});

