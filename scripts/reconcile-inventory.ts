import ds from '../src/config/typeorm.config';

/**
 * Reconciliación de inventario (producción):
 * - Normaliza estado/relaciones de numeros_medidor según su `estado`.
 * - Recalcula materialStock a partir de materiales_bodegas + inventario_tecnicos.
 *
 * Diseñado para ejecutarse contra la misma BD configurada en `.env`.
 */
async function main() {
  await ds.initialize();
  try {
    // 1) Normalizar números de medidor
    // Reglas:
    // - disponible  => sin usuarioId/inventarioTecnicoId/instalacionId/instalacionMaterialId
    // - asignado_tecnico => requiere usuarioId; bodegaId debe ser NULL
    // - en_instalacion/instalado => requiere instalacionId o instalacionMaterialId; usuarioId puede existir o no según historial

    await ds.query(`
      UPDATE numeros_medidor
      SET usuarioId = NULL,
          inventarioTecnicoId = NULL,
          instalacionId = NULL,
          instalacionMaterialId = NULL
      WHERE estado = 'disponible'
    `);

    await ds.query(`
      UPDATE numeros_medidor
      SET bodegaId = NULL
      WHERE estado = 'asignado_tecnico'
    `);

    // Si está asignado a técnico pero no tiene usuario, intentar deducirlo desde inventario_tecnicos (si existe)
    // Nota: no siempre será posible; los que queden NULL se reportan.
    await ds.query(`
      UPDATE numeros_medidor nm
      INNER JOIN inventario_tecnicos it ON it.inventarioTecnicoId = nm.inventarioTecnicoId
      SET nm.usuarioId = it.usuarioId
      WHERE nm.estado = 'asignado_tecnico'
        AND nm.usuarioId IS NULL
        AND nm.inventarioTecnicoId IS NOT NULL
    `);

    const sinUsuarioAsignados: Array<{ numeroMedidorId: number; numeroMedidor: string }> =
      await ds.query(`
        SELECT numeroMedidorId, numeroMedidor
        FROM numeros_medidor
        WHERE estado = 'asignado_tecnico'
          AND (usuarioId IS NULL OR usuarioId = 0)
        LIMIT 50
      `);

    if (sinUsuarioAsignados.length > 0) {
      // No abortar, pero dejar evidencia en consola
      // (si hay muchos, se puede resolver con una regla adicional por historial de movimientos/asignaciones).
      // eslint-disable-next-line no-console
      console.warn(
        `[reconcile] Advertencia: hay medidores ASIGNADO_TECNICO sin usuarioId (muestra 50):`,
        sinUsuarioAsignados,
      );
    }

    // 2) Recalcular materialStock desde inventarios físicos
    // materialStock := SUM(materiales_bodegas.stock) + SUM(inventario_tecnicos.cantidad)
    // (el stock de centro operativo se representa por bodegaTipo='centro' en materiales_bodegas)

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

    // 3) Ajuste específico para materiales medidor:
    // Si materialEsMedidor=1, el stock físico (materialStock) debería coincidir con
    // la cantidad de numeros_medidor en estados disponibles/asignado_tecnico/en_instalacion/instalado.
    // No vamos a forzar materialStock aquí (porque puede existir stock "no serializado"),
    // pero sí reportamos discrepancias grandes.
    const discrepancias: Array<{ materialId: number; materialNombre: string; materialStock: number; serializados: number }> =
      await ds.query(`
        SELECT
          m.materialId,
          m.materialNombre,
          COALESCE(m.materialStock, 0) AS materialStock,
          COALESCE(nm.serializados, 0) AS serializados
        FROM materiales m
        LEFT JOIN (
          SELECT materialId, COUNT(*) AS serializados
          FROM numeros_medidor
          GROUP BY materialId
        ) nm ON nm.materialId = m.materialId
        WHERE m.materialEsMedidor = 1
          AND ABS(COALESCE(m.materialStock, 0) - COALESCE(nm.serializados, 0)) >= 1
        ORDER BY ABS(COALESCE(m.materialStock, 0) - COALESCE(nm.serializados, 0)) DESC
        LIMIT 50
      `);

    // eslint-disable-next-line no-console
    console.log(`[reconcile] materialEsMedidor discrepancias (muestra 50):`, discrepancias);

    // eslint-disable-next-line no-console
    console.log('[reconcile] OK');
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('[reconcile] ERROR', e);
  process.exitCode = 1;
});

