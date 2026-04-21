"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_config_1 = require("../src/config/typeorm.config");
async function main() {
    await typeorm_config_1.default.initialize();
    try {
        const bodegasCentro = await typeorm_config_1.default.query(`SELECT sedeId, bodegaId FROM bodegas WHERE bodegaTipo='centro' AND bodegaEstado=1`);
        const sedeToBodegaCentro = new Map();
        for (const r of bodegasCentro)
            sedeToBodegaCentro.set(Number(r.sedeId), Number(r.bodegaId));
        const usuarios = await typeorm_config_1.default.query(`SELECT usuarioId, usuarioBodega, usuarioSede FROM usuarios`);
        const usuarioToBodega = new Map();
        const usuarioToSede = new Map();
        for (const u of usuarios) {
            usuarioToBodega.set(Number(u.usuarioId), u.usuarioBodega != null ? Number(u.usuarioBodega) : null);
            usuarioToSede.set(Number(u.usuarioId), u.usuarioSede != null ? Number(u.usuarioSede) : null);
        }
        const candidatos = await typeorm_config_1.default.query(`
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
            if (!(stock > 0))
                continue;
            const u = m.usuarioRegistra != null ? Number(m.usuarioRegistra) : null;
            if (u == null) {
                sinPista++;
                continue;
            }
            let bodegaId = null;
            const bU = usuarioToBodega.get(u) ?? null;
            if (bU != null && bU > 0) {
                bodegaId = Number(bU);
            }
            else {
                const sede = usuarioToSede.get(u) ?? null;
                if (sede != null && sede > 0) {
                    const bCentro = sedeToBodegaCentro.get(Number(sede));
                    if (bCentro != null)
                        bodegaId = Number(bCentro);
                }
            }
            if (bodegaId == null) {
                sinPista++;
                continue;
            }
            await typeorm_config_1.default.query(`INSERT INTO materiales_bodegas (materialId, bodegaId, stock, precioPromedio)
         VALUES (?, ?, ?, NULL)
         ON DUPLICATE KEY UPDATE stock = stock`, [Number(m.materialId), bodegaId, stock]);
            inserted++;
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
        console.log(`[reconcile-materiales-huerfanos] candidatos=${candidatos.length} inserted=${inserted} sinPista=${sinPista}`);
    }
    finally {
        await typeorm_config_1.default.destroy();
    }
}
main().catch((e) => {
    console.error('[reconcile-materiales-huerfanos] ERROR', e);
    process.exitCode = 1;
});
//# sourceMappingURL=reconcile-materiales-huerfanos.js.map