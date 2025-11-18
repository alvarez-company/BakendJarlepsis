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

  const migrationFile = path.resolve(__dirname, '../migrations/add_oficina_id_to_movimientos.sql');

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
      
      // Verificar que la columna existe
      const [columns] = await connection.query(
        "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'movimientos_inventario' AND COLUMN_NAME = 'oficinaId'",
        [database]
      );
      
      if (columns.length > 0) {
        console.log(`✅ Columna oficinaId verificada:`, columns[0]);
      } else {
        console.log(`⚠️  La columna oficinaId no se encontró después de la migración`);
      }
    } catch (err) {
      // Si la columna ya existe o el índice ya no existe, es un error esperado
      if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log(`⚠️  La migración ya fue aplicada o no es necesaria: ${path.basename(migrationFile)}`);
      } else {
        throw err;
      }
    }

    console.log(`\n✅ Migración completada exitosamente`);

  } catch (err) {
    console.error('❌ Error ejecutando migración:', err.message);
    if (err.stack) {
      console.error('Stack:', err.stack);
    }
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

run();

