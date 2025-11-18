/* eslint-disable no-console */
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function checkTable() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'jarlepsisdev';

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
    });

    console.log('Verificando tabla movimientos_inventario...');
    
    // Verificar si la tabla existe
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'movimientos_inventario'"
    );
    
    if (tables.length === 0) {
      console.error('❌ La tabla movimientos_inventario NO existe');
      return;
    }
    
    console.log('✅ La tabla movimientos_inventario existe');
    
    // Obtener estructura de la tabla
    const [columns] = await connection.query(
      'DESCRIBE movimientos_inventario'
    );
    
    console.log('\nColumnas de la tabla:');
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });
    
    // Intentar una consulta simple
    console.log('\nIntentando consulta simple...');
    const [rows] = await connection.query(
      'SELECT COUNT(*) as total FROM movimientos_inventario'
    );
    console.log(`✅ Total de movimientos: ${rows[0].total}`);
    
    // Intentar obtener algunos registros
    const [movimientos] = await connection.query(
      'SELECT * FROM movimientos_inventario LIMIT 5'
    );
    console.log(`\nPrimeros ${movimientos.length} movimientos:`);
    movimientos.forEach(m => {
      console.log(`  - ID: ${m.movimientoId}, MaterialID: ${m.materialId}, Tipo: ${m.movimientoTipo}`);
    });
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.stack) {
      console.error('Stack:', err.stack);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkTable();

