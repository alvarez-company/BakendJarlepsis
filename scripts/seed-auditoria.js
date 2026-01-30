#!/usr/bin/env node
/**
 * Crea solo las tablas de auditoría, clasificaciones y numeros_medidor.
 * Útil cuando el seed completo falla (ej. por Colombia) y necesitas poder crear materiales/medidores.
 *
 * Uso: node scripts/seed-auditoria.js
 *      npm run seed:auditoria
 */

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const MIGRATIONS_DIR = path.resolve(__dirname, '../src/migrations');

function runSqlFile(connection, filename) {
  const filepath = path.join(MIGRATIONS_DIR, filename);
  if (!fs.existsSync(filepath)) return false;
  const sql = fs.readFileSync(filepath, 'utf8');
  return connection.query(sql);
}

async function run() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'jarlepsisdev';

  console.log('📦 Seed tablas de auditoría (y numeros_medidor, clasificaciones)\n');
  console.log(`   DB: ${host}:${port}/${database}\n`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      multipleStatements: true,
      connectTimeout: 15000,
    });
    console.log('✅ Conectado\n');

    // 1. auditoria_eliminaciones
    console.log('📦 Creando auditoria_eliminaciones...');
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`auditoria_eliminaciones\` (
          \`auditoriaId\` INT NOT NULL AUTO_INCREMENT,
          \`tipoEntidad\` ENUM('movimiento', 'instalacion', 'traslado', 'asignacion') NOT NULL,
          \`entidadId\` INT NOT NULL,
          \`datosEliminados\` JSON NULL,
          \`motivo\` TEXT NULL,
          \`usuarioId\` INT NOT NULL,
          \`observaciones\` TEXT NULL,
          \`fechaEliminacion\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`auditoriaId\`),
          INDEX \`idx_tipo_entidad\` (\`tipoEntidad\`),
          INDEX \`idx_entidad_id\` (\`entidadId\`),
          INDEX \`idx_usuario_id\` (\`usuarioId\`),
          INDEX \`idx_fecha_eliminacion\` (\`fechaEliminacion\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('   ✅ auditoria_eliminaciones\n');
    } catch (e) {
      console.log('   ⚠️  ' + (e.message || e) + '\n');
    }

    // 2. auditoria_inventario
    console.log('📦 Creando auditoria_inventario...');
    try {
      await runSqlFile(connection, '2025-01-XX_create_auditoria_inventario.sql');
      console.log('   ✅ auditoria_inventario\n');
    } catch (e) {
      console.log('   ⚠️  ' + (e.message || e) + '\n');
    }

    // 3. clasificaciones
    console.log('📦 Creando clasificaciones...');
    try {
      await runSqlFile(connection, '2025-11-19_create_clasificaciones.sql');
      console.log('   ✅ clasificaciones\n');
    } catch (e) {
      console.log('   ⚠️  ' + (e.message || e) + '\n');
    }

    // 4. numeros_medidor (depende de inventario_tecnicos, instalaciones_materiales)
    console.log('📦 Creando numeros_medidor...');
    try {
      await runSqlFile(connection, '2025-01-XX_create_numeros_medidor_table.sql');
      console.log('   ✅ numeros_medidor\n');
    } catch (e) {
      console.log('   ⚠️  ' + (e.message || e) + '\n');
    }

    console.log('✅ Seed auditoría completado.\n');
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.sql) console.error('SQL:', err.sql);
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end().catch(() => {});
  }
}

run();
