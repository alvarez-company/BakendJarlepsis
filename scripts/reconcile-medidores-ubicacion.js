"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_config_1 = require("../src/config/typeorm.config");
function parseNumerosMedidor(raw) {
    if (!raw)
        return [];
    if (Array.isArray(raw))
        return raw.map(String);
    if (typeof raw === 'string') {
        const s = raw.trim();
        if (!s)
            return [];
        try {
            const parsed = JSON.parse(s);
            if (Array.isArray(parsed))
                return parsed.map(String);
            if (typeof parsed === 'string')
                return [parsed];
            return [];
        }
        catch {
            return [s];
        }
    }
    return [];
}
async function main() {
    await typeorm_config_1.default.initialize();
    try {
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
        const movimientos = await typeorm_config_1.default.query(`
      SELECT movimientoId, movimientoTipo, usuarioId, inventarioId, fechaCreacion, numerosMedidor
      FROM movimientos_inventario
      WHERE numerosMedidor IS NOT NULL
    `);
        const idxConInventario = new Map();
        const idxSinInventario = new Map();
        for (const m of movimientos) {
            const arr = parseNumerosMedidor(m.numerosMedidor);
            if (arr.length === 0)
                continue;
            for (const n of arr) {
                const key = String(n).trim();
                if (!key)
                    continue;
                if (m.inventarioId != null) {
                    const prev = idxConInventario.get(key);
                    if (!prev || new Date(m.fechaCreacion).getTime() > new Date(prev.fechaCreacion).getTime()) {
                        idxConInventario.set(key, m);
                    }
                }
                else {
                    const prev = idxSinInventario.get(key);
                    if (!prev || new Date(m.fechaCreacion).getTime() > new Date(prev.fechaCreacion).getTime()) {
                        idxSinInventario.set(key, m);
                    }
                }
            }
        }
        const candidatos = await typeorm_config_1.default.query(`
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
            const updates = [];
            for (const nm of batch) {
                const num = String(nm.numeroMedidor || '').trim();
                if (!num) {
                    skipped++;
                    continue;
                }
                const mov = idxConInventario.get(num);
                if (mov?.inventarioId != null) {
                    const bodegaId = inventarioToBodega.get(Number(mov.inventarioId));
                    if (bodegaId != null) {
                        updates.push({ id: Number(nm.numeroMedidorId), bodegaId: Number(bodegaId) });
                        continue;
                    }
                }
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
                const ids = updates.map((u) => u.id);
                const cases = updates.map((u) => `WHEN ${u.id} THEN ${u.bodegaId}`).join(' ');
                await typeorm_config_1.default.query(`
          UPDATE numeros_medidor
          SET bodegaId = CASE numeroMedidorId ${cases} ELSE bodegaId END
          WHERE numeroMedidorId IN (${ids.join(',')})
        `);
                updated += updates.length;
            }
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
        console.log(`[reconcile-medidores-ubicacion] candidatos=${candidatos.length} updated=${updated} skipped=${skipped} sinPista=${sinPista}`);
    }
    finally {
        await typeorm_config_1.default.destroy();
    }
}
main().catch((e) => {
    console.error('[reconcile-medidores-ubicacion] ERROR', e);
    process.exitCode = 1;
});
//# sourceMappingURL=reconcile-medidores-ubicacion.js.map