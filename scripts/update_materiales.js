/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'jarlepsisdev';

  console.log('Using DB config:', { host, port, user, database, password: password ? '***' : '' });

  const file = path.resolve(__dirname, '../src/migrations/update_materiales_table.sql');

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

    if (!fs.existsSync(file)) {
      console.log('❌ Archivo no encontrado:', file);
      process.exitCode = 1;
      return;
    }

    const sql = fs.readFileSync(file, 'utf8');
    console.log(`\n-- Ejecutando migración: ${file}`);
    await connection.query(sql);
    console.log(`\n✅ Migración completada exitosamente`);

  } catch (err) {
    console.error('❌ Error ejecutando migración:', err.message);
    if (err.sqlMessage) {
      console.error('SQL Error:', err.sqlMessage);
    }
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end().catch(() => {});
    }
  }
}

run();

