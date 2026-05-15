/* eslint-disable no-console */
/**
 * Reset operativo de inventario (NO borra catálogo):
 * - Elimina movimientos, traslados, asignaciones, inventario técnico, transferencias entre técnicos, auditoría.
 * - Pone stock en 0 (materiales + materiales_bodegas).
 * - Elimina todos los números de medidor.
 *
 * Mantiene: materiales, bodegas, sedes, usuarios, inventarios (registros), instalaciones.
 *
 * Uso:
 *   npm run inventory:reset          (pide confirmación)
 *   npm run inventory:reset:yes      (sin confirmación)
 */
const readline = require('readline');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

function askQuestion(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function tableExists(connection, tableName) {
  const [rows] = await connection.query(
    `SELECT 1 FROM information_schema.tables 
     WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
    [tableName],
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function truncateIfExists(connection, tableName) {
  if (!(await tableExists(connection, tableName))) {
    console.log(`   ⏭  Tabla omitida (no existe): ${tableName}`);
    return;
  }
  await connection.query(`TRUNCATE TABLE \`${tableName}\``);
  console.log(`   ✓ ${tableName}`);
}

async function main() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'jarlepsisdev';

  const skipConfirm = process.argv.includes('--yes') || process.argv.includes('-y');

  console.log('\n⚠️  RESET OPERATIVO DE INVENTARIO\n');
  console.log(`   Host: ${host}:${port}`);
  console.log(`   Base de datos: ${database}\n`);
  console.log('   Se eliminarán: movimientos, traslados, asignaciones, stock y números de medidor.');
  console.log('   Se mantienen: materiales (catálogo), bodegas, usuarios, sedes.\n');

  if (!skipConfirm) {
    const answer = await askQuestion('Escribe "RESET" para continuar: ');
    if (String(answer).trim().toUpperCase() !== 'RESET') {
      console.log('❌ Cancelado.\n');
      process.exit(0);
    }
  }

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      multipleStatements: true,
      connectTimeout: 30000,
    });

    console.log('\n🔄 Ejecutando reset...\n');

    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    console.log('📦 Limpiando operaciones:');
    await truncateIfExists(connection, 'movimientos_inventario');
    await truncateIfExists(connection, 'traslados');
    await truncateIfExists(connection, 'asignaciones_tecnicos');
    await truncateIfExists(connection, 'inventario_tecnicos');
    await truncateIfExists(connection, 'transferencias_tecnicos');
    await truncateIfExists(connection, 'auditoria_inventario');

    console.log('\n📊 Stock a cero:');
    if (await tableExists(connection, 'materiales')) {
      const [r1] = await connection.query('UPDATE `materiales` SET `materialStock` = 0');
      console.log(`   ✓ materiales.materialStock (${r1.affectedRows ?? 0} filas)`);
    }
    if (await tableExists(connection, 'materiales_bodegas')) {
      const [r2] = await connection.query('UPDATE `materiales_bodegas` SET `stock` = 0');
      console.log(`   ✓ materiales_bodegas.stock (${r2.affectedRows ?? 0} filas)`);
    }

    console.log('\n🔢 Números de medidor:');
    await truncateIfExists(connection, 'numeros_medidor');

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    const [[{ movimientos }]] = await connection.query(
      'SELECT COUNT(*) AS movimientos FROM movimientos_inventario',
    ).catch(() => [[{ movimientos: '?' }]]);
    const [[{ medidores }]] = await connection.query(
      'SELECT COUNT(*) AS medidores FROM numeros_medidor',
    ).catch(() => [[{ medidores: 0 }]]);
    const [[{ stockSum }]] = await connection.query(
      'SELECT COALESCE(SUM(materialStock), 0) AS stockSum FROM materiales',
    ).catch(() => [[{ stockSum: 0 }]]);

    console.log('\n✅ Reset completado.\n');
    console.log(`   Movimientos restantes: ${movimientos ?? 0}`);
    console.log(`   Números de medidor restantes: ${medidores ?? 0}`);
    console.log(`   Suma materialStock: ${stockSum ?? 0}\n`);
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      console.error('   Verifica DB_HOST, VPN o acceso a la base de datos.\n');
    }
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end().catch(() => {});
  }
}

main();
