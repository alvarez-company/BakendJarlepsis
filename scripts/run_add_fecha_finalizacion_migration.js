const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3307', 10);
  const user = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || 'root';
  const database = process.env.DB_NAME || 'jarlepsisdev';

  console.log('Using DB config:', { host, port, user, database, password: password ? '***' : '' });

  const migrationFile = path.resolve(__dirname, '../src/migrations/2025-12-06_add_fecha_finalizacion.sql');

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
    console.log('SQL:', sql);
    
    try {
      await connection.query(sql);
      console.log(`✅ Migración completada: ${path.basename(migrationFile)}`);
    } catch (err) {
      // Si la columna ya existe, es un error esperado
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log(`⚠️  La columna fechaFinalizacion ya existe`);
      } else {
        throw err;
      }
    }

    // Verificar que la columna existe
    const [rows] = await connection.query(
      "SHOW COLUMNS FROM instalaciones LIKE 'fechaFinalizacion'"
    );
    
    if (rows.length > 0) {
      console.log(`✅ Columna fechaFinalizacion verificada exitosamente`);
      console.log(`   Tipo: ${rows[0].Type}, Null: ${rows[0].Null}`);
    } else {
      console.log(`⚠️  La columna fechaFinalizacion no se encontró después de la migración`);
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

