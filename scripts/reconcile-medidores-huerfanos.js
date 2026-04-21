"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_config_1 = require("../src/config/typeorm.config");
async function main() {
    await typeorm_config_1.default.initialize();
    try {
        const materiales = await typeorm_config_1.default.query(`SELECT materialId, usuarioRegistra FROM materiales`);
        const materialToUsuarioRegistra = new Map();
        for (const m of materiales) {
            materialToUsuarioRegistra.set(Number(m.materialId), m.usuarioRegistra != null ? Number(m.usuarioRegistra) : null);
        }
        const inventarios = await typeorm_config_1.default.query(`SELECT inventarioId, bodegaId FROM inventarios`);
        const inventarioToBodega = new Map();
        for (const r of inventarios)
            inventarioToBodega.set(Number(r.inventarioId), Number(r.bodegaId));
        const bodegasCentro = await typeorm_config_1.default.query(`SELECT sedeId, bodegaId FROM bodegas WHERE bodegaTipo = 'centro' AND bodegaEstado = 1`);
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
            const asigs = await typeorm_config_1.default.query(`
        SELECT inventarioId, usuarioAsignadorId, fechaCreacion
        FROM asignaciones_tecnicos
        WHERE JSON_SEARCH(materiales, 'one', ?, NULL, '$**.numerosMedidor[*]') IS NOT NULL
        ORDER BY fechaCreacion DESC
        LIMIT 1
      `, [num]);
            let bodegaIdAsignar = null;
            if (asigs.length > 0) {
                const a = asigs[0];
                const bFromInv = inventarioToBodega.get(Number(a.inventarioId));
                if (bFromInv != null) {
                    bodegaIdAsignar = Number(bFromInv);
                }
                else {
                    const u = Number(a.usuarioAsignadorId);
                    const bU = usuarioToBodega.get(u) ?? null;
                    if (bU != null && bU > 0)
                        bodegaIdAsignar = Number(bU);
                    else {
                        const sede = usuarioToSede.get(u) ?? null;
                        if (sede != null && sede > 0) {
                            const bCentro = sedeToBodegaCentro.get(Number(sede));
                            if (bCentro != null)
                                bodegaIdAsignar = Number(bCentro);
                        }
                    }
                }
            }
            if (bodegaIdAsignar == null) {
                const movs = await typeorm_config_1.default.query(`
          SELECT inventarioId, usuarioId, fechaCreacion
          FROM movimientos_inventario
          WHERE numerosMedidor IS NOT NULL
            AND JSON_SEARCH(numerosMedidor, 'one', ?) IS NOT NULL
          ORDER BY fechaCreacion DESC
          LIMIT 1
        `, [num]);
                if (movs.length > 0) {
                    const m = movs[0];
                    if (m.inventarioId != null) {
                        const bFromInv = inventarioToBodega.get(Number(m.inventarioId));
                        if (bFromInv != null)
                            bodegaIdAsignar = Number(bFromInv);
                    }
                    if (bodegaIdAsignar == null) {
                        const u = Number(m.usuarioId);
                        const bU = usuarioToBodega.get(u) ?? null;
                        if (bU != null && bU > 0)
                            bodegaIdAsignar = Number(bU);
                        else {
                            const sede = usuarioToSede.get(u) ?? null;
                            if (sede != null && sede > 0) {
                                const bCentro = sedeToBodegaCentro.get(Number(sede));
                                if (bCentro != null)
                                    bodegaIdAsignar = Number(bCentro);
                            }
                        }
                    }
                }
            }
            if (bodegaIdAsignar == null) {
                const u = materialToUsuarioRegistra.get(Number(nm.materialId)) ?? null;
                if (u != null && u > 0) {
                    const bU = usuarioToBodega.get(u) ?? null;
                    if (bU != null && bU > 0)
                        bodegaIdAsignar = Number(bU);
                    else {
                        const sede = usuarioToSede.get(u) ?? null;
                        if (sede != null && sede > 0) {
                            const bCentro = sedeToBodegaCentro.get(Number(sede));
                            if (bCentro != null)
                                bodegaIdAsignar = Number(bCentro);
                        }
                    }
                }
            }
            if (bodegaIdAsignar == null) {
                sinPista++;
                continue;
            }
            await typeorm_config_1.default.query(`UPDATE numeros_medidor SET bodegaId = ? WHERE numeroMedidorId = ?`, [
                bodegaIdAsignar,
                Number(nm.numeroMedidorId),
            ]);
            updated++;
        }
        console.log(`[reconcile-medidores-huerfanos] candidatos=${candidatos.length} updated=${updated} sinPista=${sinPista}`);
    }
    finally {
        await typeorm_config_1.default.destroy();
    }
}
main().catch((e) => {
    console.error('[reconcile-medidores-huerfanos] ERROR', e);
    process.exitCode = 1;
});
//# sourceMappingURL=reconcile-medidores-huerfanos.js.map