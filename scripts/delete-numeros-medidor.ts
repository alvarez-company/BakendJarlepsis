import * as fs from 'fs';
import * as path from 'path';
import ds from '../src/config/typeorm.config';

type MedidorRow = {
  numeroMedidorId: number;
  numeroMedidor: string;
  materialId: number;
  estado: string;
  bodegaId: number | null;
  usuarioId: number | null;
  instalacionId: number | null;
};

const ESTADOS_BLOQUEADOS = new Set(['instalado', 'en_instalacion']);

function parseArgs(argv: string[]) {
  const out: Record<string, string | boolean> = { apply: false, force: false, help: false };
  for (const arg of argv) {
    if (arg === '--apply' || arg === '-y') out.apply = true;
    else if (arg === '--force') out.force = true;
    else if (arg === '--help' || arg === '-h') out.help = true;
    else if (arg.startsWith('--ids=')) out.ids = arg.slice('--ids='.length);
    else if (arg.startsWith('--numeros=')) out.numeros = arg.slice('--numeros='.length);
    else if (arg.startsWith('--material-id=')) out['material-id'] = arg.slice('--material-id='.length);
    else if (arg.startsWith('--bodega-id=')) out['bodega-id'] = arg.slice('--bodega-id='.length);
    else if (arg.startsWith('--estado=')) out.estado = arg.slice('--estado='.length);
    else if (arg.startsWith('--file=')) out.file = arg.slice('--file='.length);
    else if (arg.startsWith('--limit=')) out.limit = arg.slice('--limit='.length);
  }
  return out;
}

function printHelp() {
  // eslint-disable-next-line no-console
  console.log(`
Elimina números de medidor de la tabla numeros_medidor y recalcula stock de los materiales afectados.

Uso:
  npm run medidores:delete -- [opciones]

Opciones (al menos una de filtro):
  --ids=1,2,3              IDs internos (numeroMedidorId)
  --numeros=M001,M002      Números de medidor (case-insensitive)
  --file=./numeros.txt     Archivo con un número por línea
  --material-id=5          Todos los medidores de un material
  --bodega-id=3            Filtrar por bodega
  --estado=disponible      Filtrar por estado (disponible, asignado_tecnico, ...)
  --limit=100              Máximo de filas a procesar (default: 5000)

Ejecución:
  --apply, -y                Ejecuta el borrado (sin esto solo muestra vista previa)
  --force                    Permite borrar en_instalacion / instalado (por defecto se omiten)
  --help, -h                 Esta ayuda

Ejemplos:
  npm run medidores:delete -- --numeros=ABC123,XYZ789
  npm run medidores:delete -- --material-id=12 --estado=disponible --apply
  npm run medidores:delete -- --file=./medidores-a-borrar.txt --apply
  npm run medidores:delete -- --ids=10,11,12 --apply --force
`);
}

function parseCsvNumbers(raw: string): number[] {
  return raw
    .split(/[,;\s]+/)
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function parseCsvStrings(raw: string): string[] {
  return raw
    .split(/[,;]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function readNumerosFromFile(filePath: string): string[] {
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`Archivo no encontrado: ${abs}`);
  }
  return fs
    .readFileSync(abs, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

function normalizeNumero(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

async function syncMaterialStock(dsConn: typeof ds, materialId: number): Promise<void> {
  const [stockBodegasRow] = await dsConn.query<Array<{ total: string }>>(
    `SELECT COALESCE(SUM(stock), 0) AS total FROM materiales_bodegas WHERE materialId = ?`,
    [materialId],
  );
  const [stockTecnicosRow] = await dsConn.query<Array<{ total: string }>>(
    `SELECT COALESCE(SUM(cantidad), 0) AS total FROM inventario_tecnicos WHERE materialId = ?`,
    [materialId],
  );
  const stockTotal =
    Number(stockBodegasRow?.total || 0) + Number(stockTecnicosRow?.total || 0);
  await dsConn.query(`UPDATE materiales SET materialStock = ? WHERE materialId = ?`, [
    stockTotal,
    materialId,
  ]);
}

/**
 * Para materiales medidor: alinea stock en bodegas/técnicos con el conteo real de seriales.
 */
async function recalcularStockDesdeSeriales(dsConn: typeof ds, materialId: number): Promise<void> {
  const [mat] = await dsConn.query<Array<{ materialEsMedidor: number | boolean }>>(
    `SELECT materialEsMedidor FROM materiales WHERE materialId = ? LIMIT 1`,
    [materialId],
  );
  if (!mat?.materialEsMedidor) {
    await syncMaterialStock(dsConn, materialId);
    return;
  }

  const porBodega = await dsConn.query<Array<{ bodegaId: number | null; cnt: string }>>(
    `SELECT bodegaId, COUNT(*) AS cnt
     FROM numeros_medidor
     WHERE materialId = ? AND estado = 'disponible'
     GROUP BY bodegaId`,
    [materialId],
  );
  const countPorBodega = new Map<number, number>();
  for (const r of porBodega) {
    if (r.bodegaId == null) continue;
    countPorBodega.set(Number(r.bodegaId), Number(r.cnt || 0));
  }

  const filasBodega = await dsConn.query<Array<{ materialBodegaId: number; bodegaId: number }>>(
    `SELECT materialBodegaId, bodegaId FROM materiales_bodegas WHERE materialId = ?`,
    [materialId],
  );
  const bodegasVistas = new Set<number>();
  for (const fb of filasBodega) {
    const bid = Number(fb.bodegaId);
    bodegasVistas.add(bid);
    const nuevo = countPorBodega.get(bid) ?? 0;
    await dsConn.query(`UPDATE materiales_bodegas SET stock = ? WHERE materialBodegaId = ?`, [
      nuevo,
      fb.materialBodegaId,
    ]);
  }
  for (const [bodegaId, cnt] of countPorBodega) {
    if (bodegasVistas.has(bodegaId) || cnt <= 0) continue;
    await dsConn.query(
      `INSERT INTO materiales_bodegas (materialId, bodegaId, stock) VALUES (?, ?, ?)`,
      [materialId, bodegaId, cnt],
    );
  }

  const porTecnico = await dsConn.query<Array<{ usuarioId: number; cnt: string }>>(
    `SELECT usuarioId, COUNT(*) AS cnt
     FROM numeros_medidor
     WHERE materialId = ? AND estado = 'asignado_tecnico' AND usuarioId IS NOT NULL
     GROUP BY usuarioId`,
    [materialId],
  );
  const countPorTecnico = new Map<number, number>();
  for (const r of porTecnico) {
    countPorTecnico.set(Number(r.usuarioId), Number(r.cnt || 0));
  }

  const filasTecnico = await dsConn.query<
    Array<{ inventarioTecnicoId: number; usuarioId: number }>
  >(`SELECT inventarioTecnicoId, usuarioId FROM inventario_tecnicos WHERE materialId = ?`, [
    materialId,
  ]);
  const tecnicosVistos = new Set<number>();
  for (const ft of filasTecnico) {
    const uid = Number(ft.usuarioId);
    tecnicosVistos.add(uid);
    const nuevo = countPorTecnico.get(uid) ?? 0;
    await dsConn.query(`UPDATE inventario_tecnicos SET cantidad = ? WHERE inventarioTecnicoId = ?`, [
      nuevo,
      ft.inventarioTecnicoId,
    ]);
  }
  for (const [usuarioId, cnt] of countPorTecnico) {
    if (tecnicosVistos.has(usuarioId)) continue;
    await dsConn.query(
      `INSERT INTO inventario_tecnicos (usuarioId, materialId, cantidad) VALUES (?, ?, ?)`,
      [usuarioId, materialId, cnt],
    );
  }

  await syncMaterialStock(dsConn, materialId);
}

async function buscarMedidores(args: Record<string, string | boolean>): Promise<MedidorRow[]> {
  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (args.ids) {
    const ids = parseCsvNumbers(String(args.ids));
    if (!ids.length) throw new Error('--ids no contiene IDs válidos');
    conditions.push(`n.numeroMedidorId IN (${ids.map(() => '?').join(',')})`);
    params.push(...ids);
  }

  const numerosSet = new Set<string>();
  if (args.numeros) {
    for (const n of parseCsvStrings(String(args.numeros))) {
      numerosSet.add(normalizeNumero(n));
    }
  }
  if (args.file) {
    for (const n of readNumerosFromFile(String(args.file))) {
      numerosSet.add(normalizeNumero(n));
    }
  }
  if (numerosSet.size > 0) {
    const nums = [...numerosSet];
    conditions.push(`LOWER(TRIM(n.numeroMedidor)) IN (${nums.map(() => '?').join(',')})`);
    params.push(...nums);
  }

  if (args['material-id']) {
    const mid = Number(args['material-id']);
    if (!Number.isFinite(mid) || mid <= 0) throw new Error('--material-id inválido');
    conditions.push('n.materialId = ?');
    params.push(mid);
  }

  if (args['bodega-id']) {
    const bid = Number(args['bodega-id']);
    if (!Number.isFinite(bid) || bid <= 0) throw new Error('--bodega-id inválido');
    conditions.push('n.bodegaId = ?');
    params.push(bid);
  }

  if (args.estado) {
    conditions.push('n.estado = ?');
    params.push(String(args.estado).trim().toLowerCase());
  }

  if (!conditions.length) {
    throw new Error('Debes indicar al menos un filtro: --ids, --numeros, --file o --material-id');
  }

  const limit = args.limit ? Math.max(1, Number(args.limit)) : 5000;
  const where = conditions.map((c) => `(${c})`).join(' AND ');

  return ds.query<MedidorRow[]>(
    `SELECT n.numeroMedidorId, n.numeroMedidor, n.materialId, n.estado, n.bodegaId, n.usuarioId, n.instalacionId
     FROM numeros_medidor n
     WHERE ${where}
     ORDER BY n.numeroMedidorId ASC
     LIMIT ?`,
    [...params, limit],
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  await ds.initialize();
  try {
    const candidatos = await buscarMedidores(args);
    if (!candidatos.length) {
      // eslint-disable-next-line no-console
      console.log('[delete-numeros-medidor] No se encontraron medidores con los filtros indicados.');
      return;
    }

    const force = Boolean(args.force);
    const aEliminar: MedidorRow[] = [];
    const omitidos: MedidorRow[] = [];

    for (const row of candidatos) {
      if (!force && ESTADOS_BLOQUEADOS.has(String(row.estado).toLowerCase())) {
        omitidos.push(row);
      } else {
        aEliminar.push(row);
      }
    }

    // eslint-disable-next-line no-console
    console.log(`[delete-numeros-medidor] Encontrados: ${candidatos.length}`);
    // eslint-disable-next-line no-console
    console.log(`[delete-numeros-medidor] A eliminar: ${aEliminar.length} | Omitidos: ${omitidos.length}`);

    if (omitidos.length) {
      // eslint-disable-next-line no-console
      console.log('\nOmitidos (use --force para incluirlos):');
      for (const o of omitidos.slice(0, 20)) {
        // eslint-disable-next-line no-console
        console.log(
          `  - id=${o.numeroMedidorId} numero=${o.numeroMedidor} estado=${o.estado} materialId=${o.materialId}`,
        );
      }
      if (omitidos.length > 20) {
        // eslint-disable-next-line no-console
        console.log(`  ... y ${omitidos.length - 20} más`);
      }
    }

    if (aEliminar.length) {
      // eslint-disable-next-line no-console
      console.log('\nVista previa:');
      for (const r of aEliminar.slice(0, 30)) {
        // eslint-disable-next-line no-console
        console.log(
          `  - id=${r.numeroMedidorId} numero=${r.numeroMedidor} estado=${r.estado} materialId=${r.materialId} bodegaId=${r.bodegaId ?? '-'} usuarioId=${r.usuarioId ?? '-'}`,
        );
      }
      if (aEliminar.length > 30) {
        // eslint-disable-next-line no-console
        console.log(`  ... y ${aEliminar.length - 30} más`);
      }
    }

    if (!args.apply) {
      // eslint-disable-next-line no-console
      console.log('\nModo simulación. Agrega --apply para ejecutar el borrado.');
      return;
    }

    if (!aEliminar.length) {
      // eslint-disable-next-line no-console
      console.log('\nNada que eliminar.');
      return;
    }

    const ids = aEliminar.map((r) => r.numeroMedidorId);
    const materialIds = [...new Set(aEliminar.map((r) => r.materialId))];

    await ds.transaction(async (manager) => {
      const chunkSize = 500;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        await manager.query(
          `DELETE FROM numeros_medidor WHERE numeroMedidorId IN (${chunk.map(() => '?').join(',')})`,
          chunk,
        );
      }
    });

    for (const materialId of materialIds) {
      await recalcularStockDesdeSeriales(ds, materialId);
    }

    // eslint-disable-next-line no-console
    console.log(
      `\n[delete-numeros-medidor] Eliminados: ${ids.length}. Materiales resincronizados: ${materialIds.join(', ')}`,
    );
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('[delete-numeros-medidor] ERROR', e?.message || e);
  process.exitCode = 1;
});
