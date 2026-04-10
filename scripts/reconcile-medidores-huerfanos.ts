import ds from '../src/config/typeorm.config';

/**
 * Asigna SOLO medidores "huérfanos" (disponibles y sin bodega/usuario/instalación)
 * usando el usuario que los registró en BD, incluyendo impersonación.
 *
 * Fuentes (en orden):
 * 1) `asignaciones_tecnicos.materiales` (JSON) -> usa inventarioId origen (bodega del inventario)
 *    - si no se puede, usa usuarioAsignadorId (su bodega o su centro).
 * 2) `movimientos_inventario.numerosMedidor` (JSON) -> usa inventarioId del movimiento
 *    - si no se puede, usa usuarioId del movimiento (su bodega o su centro).
 */
async function main() {
  await ds.initialize();
  try {
    const materiales: Array<{ materialId: number; usuarioRegistra: number | null }> = await ds.query(
      `SELECT materialId, usuarioRegistra FROM materiales`,
    );
    const materialToUsuarioRegistra = new Map<number, number | null>();
    for (const m of materiales) {
      materialToUsuarioRegistra.set(Number(m.materialId), m.usuarioRegistra != null ? Number(m.usuarioRegistra) : null);
    }

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

    const candidatos: Array<{ numeroMedidorId: number; numeroMedidor: string; materialId: number }> =
      await ds.query(`
      SELECT numeroMedidorId, numeroMedidor, materialId
      FROM numeros_medidor
      WHERE estado = 'disponible'
        AND bodegaId IS NULL
        AND (usuarioId IS NULL OR usuarioId = 0)
        AND (instalacionId IS NULL OR instalacionId = 0)
        AND (instalacionMaterialId IS NULL OR instalacionMaterialId = 0)
      LIMIT 50000
    `);

    let updated = 0;
    let sinPista = 0;

    for (const nm of candidatos) {
      const num = String(nm.numeroMedidor || '').trim();
      if (!num) {
        sinPista++;
        continue;
      }

      // 1) Buscar en asignaciones_tecnicos
      const asigs: Array<{ inventarioId: number; usuarioAsignadorId: number; fechaCreacion: string }> =
        await ds.query(
          `
        SELECT inventarioId, usuarioAsignadorId, fechaCreacion
        FROM asignaciones_tecnicos
        WHERE JSON_SEARCH(materiales, 'one', ?, NULL, '$**.numerosMedidor[*]') IS NOT NULL
        ORDER BY fechaCreacion DESC
        LIMIT 1
      `,
          [num],
        );

      let bodegaIdAsignar: number | null = null;

      if (asigs.length > 0) {
        const a = asigs[0];
        const bFromInv = inventarioToBodega.get(Number(a.inventarioId));
        if (bFromInv != null) {
          bodegaIdAsignar = Number(bFromInv);
        } else {
          const u = Number(a.usuarioAsignadorId);
          const bU = usuarioToBodega.get(u) ?? null;
          if (bU != null && bU > 0) bodegaIdAsignar = Number(bU);
          else {
            const sede = usuarioToSede.get(u) ?? null;
            if (sede != null && sede > 0) {
              const bCentro = sedeToBodegaCentro.get(Number(sede));
              if (bCentro != null) bodegaIdAsignar = Number(bCentro);
            }
          }
        }
      }

      // 2) Buscar en movimientos_inventario (si no salió por asignaciones)
      if (bodegaIdAsignar == null) {
        const movs: Array<{ inventarioId: number | null; usuarioId: number; fechaCreacion: string }> =
          await ds.query(
            `
          SELECT inventarioId, usuarioId, fechaCreacion
          FROM movimientos_inventario
          WHERE numerosMedidor IS NOT NULL
            AND JSON_SEARCH(numerosMedidor, 'one', ?) IS NOT NULL
          ORDER BY fechaCreacion DESC
          LIMIT 1
        `,
            [num],
          );

        if (movs.length > 0) {
          const m = movs[0];
          if (m.inventarioId != null) {
            const bFromInv = inventarioToBodega.get(Number(m.inventarioId));
            if (bFromInv != null) bodegaIdAsignar = Number(bFromInv);
          }
          if (bodegaIdAsignar == null) {
            const u = Number(m.usuarioId);
            const bU = usuarioToBodega.get(u) ?? null;
            if (bU != null && bU > 0) bodegaIdAsignar = Number(bU);
            else {
              const sede = usuarioToSede.get(u) ?? null;
              if (sede != null && sede > 0) {
                const bCentro = sedeToBodegaCentro.get(Number(sede));
                if (bCentro != null) bodegaIdAsignar = Number(bCentro);
              }
            }
          }
        }
      }

      // 3) Fallback: usar el usuario que registró el MATERIAL (materiales.usuarioRegistra)
      if (bodegaIdAsignar == null) {
        const u = materialToUsuarioRegistra.get(Number(nm.materialId)) ?? null;
        if (u != null && u > 0) {
          const bU = usuarioToBodega.get(u) ?? null;
          if (bU != null && bU > 0) bodegaIdAsignar = Number(bU);
          else {
            const sede = usuarioToSede.get(u) ?? null;
            if (sede != null && sede > 0) {
              const bCentro = sedeToBodegaCentro.get(Number(sede));
              if (bCentro != null) bodegaIdAsignar = Number(bCentro);
            }
          }
        }
      }

      if (bodegaIdAsignar == null) {
        sinPista++;
        continue;
      }

      await ds.query(`UPDATE numeros_medidor SET bodegaId = ? WHERE numeroMedidorId = ?`, [
        bodegaIdAsignar,
        Number(nm.numeroMedidorId),
      ]);
      updated++;
    }

    // eslint-disable-next-line no-console
    console.log(
      `[reconcile-medidores-huerfanos] candidatos=${candidatos.length} updated=${updated} sinPista=${sinPista}`,
    );
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('[reconcile-medidores-huerfanos] ERROR', e);
  process.exitCode = 1;
});

