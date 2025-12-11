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

  console.log('🔌 Conectando a la base de datos...');
  console.log('Configuración:', { host, port, user, database, password: password ? '***' : '' });

  const migrationFile = path.resolve(__dirname, '../src/migrations/add_fecha_asignacion_metrogas.sql');

  if (!fs.existsSync(migrationFile)) {
    console.log(`❌ Archivo no encontrado: ${migrationFile}`);
    process.exitCode = 1;
    return;
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
      connectTimeout: 15000,
    });

    const sql = fs.readFileSync(migrationFile, 'utf8');
    console.log(`\n📝 Ejecutando migración: ${path.basename(migrationFile)}`);
    await connection.query(sql);
    console.log(`✅ Campo fechaAsignacionMetrogas agregado exitosamente`);

    // Verificar que se agregó correctamente
    const [rows] = await connection.query(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'instalaciones' 
       AND COLUMN_NAME = 'fechaAsignacionMetrogas'`,
      [database]
    );
    
    if (rows.length > 0) {
      console.log(`\n✅ Verificación exitosa:`);
      console.log(`   Columna: ${rows[0].COLUMN_NAME}`);
      console.log(`   Tipo: ${rows[0].DATA_TYPE}`);
      console.log(`   Nullable: ${rows[0].IS_NULLABLE}`);
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
