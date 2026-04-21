"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_config_1 = require("../src/config/typeorm.config");
async function main() {
    await typeorm_config_1.default.initialize();
    try {
        await typeorm_config_1.default.query(`
      UPDATE numeros_medidor
      SET usuarioId = NULL,
          inventarioTecnicoId = NULL,
          instalacionId = NULL,
          instalacionMaterialId = NULL
      WHERE estado = 'disponible'
    `);
        await typeorm_config_1.default.query(`
      UPDATE numeros_medidor
      SET bodegaId = NULL
      WHERE estado = 'asignado_tecnico'
    `);
        await typeorm_config_1.default.query(`
      UPDATE numeros_medidor nm
      INNER JOIN inventario_tecnicos it ON it.inventarioTecnicoId = nm.inventarioTecnicoId
      SET nm.usuarioId = it.usuarioId
      WHERE nm.estado = 'asignado_tecnico'
        AND nm.usuarioId IS NULL
        AND nm.inventarioTecnicoId IS NOT NULL
    `);
        const sinUsuarioAsignados = await typeorm_config_1.default.query(`
        SELECT numeroMedidorId, numeroMedidor
        FROM numeros_medidor
        WHERE estado = 'asignado_tecnico'
          AND (usuarioId IS NULL OR usuarioId = 0)
        LIMIT 50
      `);
        if (sinUsuarioAsignados.length > 0) {
            console.warn(`[reconcile] Advertencia: hay medidores ASIGNADO_TECNICO sin usuarioId (muestra 50):`, sinUsuarioAsignados);
        }
        await typeorm_config_1.default.query(`
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
        const discrepancias = await typeorm_config_1.default.query(`
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
        console.log(`[reconcile] materialEsMedidor discrepancias (muestra 50):`, discrepancias);
        console.log('[reconcile] OK');
    }
    finally {
        await typeorm_config_1.default.destroy();
    }
}
main().catch((e) => {
    console.error('[reconcile] ERROR', e);
    process.exitCode = 1;
});
//# sourceMappingURL=reconcile-inventory.js.map