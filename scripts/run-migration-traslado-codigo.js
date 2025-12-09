const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'jarlepsisdev',
    multipleStatements: true,
  });

  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '../src/migrations/AddTrasladoCodigo.sql'),
      'utf8'
    );

    console.log('Ejecutando migración AddTrasladoCodigo.sql...');
    await connection.query(sql);
    console.log('✅ Migración ejecutada exitosamente!');
  } catch (error) {
    console.error('❌ Error al ejecutar la migración:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigration();
