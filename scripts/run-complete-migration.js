/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function runMigration() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'jarlepsisdev';

  const migrationFile = path.resolve(__dirname, '../migrations/0002_create_complete_schema_updated.sql');

  console.log('🚀 Ejecutando migración completa de base de datos...\n');
  console.log('📋 Configuración:');
  console.log(`   Host: ${host}`);
  console.log(`   Puerto: ${port}`);
  console.log(`   Usuario: ${user}`);
  console.log(`   Base de datos: ${database}`);
  console.log(`   Archivo: ${migrationFile}\n`);

  if (!fs.existsSync(migrationFile)) {
    console.error(`❌ Error: No se encontró el archivo de migración: ${migrationFile}`);
    process.exit(1);
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

    console.log('✅ Conectado a la base de datos\n');

    console.log('📦 Leyendo archivo de migración...');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    console.log('🔨 Ejecutando migración (esto puede tardar unos minutos)...\n');
    await connection.query(sql);

    console.log('✅ Migración ejecutada exitosamente!\n');

    // Verificar que las tablas se crearon
    console.log('🔍 Verificando tablas creadas...');
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`✅ Se crearon ${tables.length} tablas\n`);

    console.log('📋 Próximos pasos:');
    console.log('   1. Ejecutar seed de datos iniciales: npm run seed:full');
    console.log('   2. Verificar que todo funciona correctamente\n');

  } catch (err) {
    console.error('❌ Error ejecutando migración:', err.message);
    if (err.sql) {
      console.error('SQL Error:', err.sql.substring(0, 200));
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end().catch(() => {});
    }
  }
}

runMigration();
