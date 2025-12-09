const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'jarlepsisdev';

  console.log('Using DB config:', { host, port, user, database, password: password ? '***' : '' });

  const migrationFile = path.resolve(__dirname, '../src/migrations/2025-12-06_remove_unique_constraint_inventario_tecnicos.sql');

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

    if (!fs.existsSync(migrationFile)) {
      console.log(`❌ Archivo no encontrado: ${migrationFile}`);
      process.exitCode = 1;
      return;
    }

    const sql = fs.readFileSync(migrationFile, 'utf8');
    console.log(`\n-- Ejecutando migración: ${path.basename(migrationFile)}`);
    try {
      await connection.query(sql);
      console.log(`✅ Migración completada: ${path.basename(migrationFile)}`);
    } catch (err) {
      // Si el índice ya no existe, es un error esperado
      if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY' || err.message.includes('does not exist')) {
        console.log(`⚠️  La restricción única ya fue eliminada o no existe: ${path.basename(migrationFile)}`);
      } else {
        throw err;
      }
    }

    console.log(`\n✅ Migración completada exitosamente`);

  } catch (err) {
    console.error('❌ Error ejecutando migración:', err.message);
    if (err.sqlMessage) {
      console.error('SQL Error:', err.sqlMessage);
    }
    if (err.sql) {
      console.error('SQL:', err.sql);
    }
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end().catch(() => {});
    }
  }
}

run();

