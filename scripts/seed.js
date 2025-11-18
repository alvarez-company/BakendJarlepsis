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

  const files = [
    path.resolve(__dirname, '../src/migrations/seed_colombia.sql'),
    path.resolve(__dirname, '../src/migrations/seed_initial_data.sql'),
  ];

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

    for (const filePath of files) {
      if (!fs.existsSync(filePath)) {
        console.log('Archivo no encontrado, se omite:', filePath);
        continue;
        }
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`\n-- Ejecutando: ${filePath}`);
      await connection.query(sql);
      console.log(`-- OK: ${filePath}`);
    }

    console.log('\n✅ Seed completado');
  } catch (err) {
    console.error('❌ Error ejecutando seed:', err.message);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end().catch(() => {});
    }
  }
}

run();


