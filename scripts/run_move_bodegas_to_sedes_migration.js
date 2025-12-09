const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function runMigration() {
  let connection;
  
  try {
    // Leer configuración de la base de datos desde .env o usar valores por defecto
    const host = process.env.DB_HOST || process.env.DB_HOSTNAME || '127.0.0.1';
    const port = parseInt(process.env.DB_PORT || '3306', 10);
    const user = process.env.DB_USER || process.env.DB_USERNAME || 'root';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || 'jarlepsisdev';
    
    const dbConfig = {
      host,
      port,
      user,
      password,
      database,
      multipleStatements: true,
      connectTimeout: 15000,
    };
    
    console.log('Using DB config:', { host, port, user, database, password: password ? '***' : '' });

    console.log('Conectando a la base de datos...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conexión establecida');

    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, '../src/migrations/2025-12-05_move_bodegas_from_oficinas_to_sedes.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Ejecutando migración...');
    await connection.query(migrationSQL);
    console.log('✅ Migración ejecutada exitosamente');

    console.log('\n📋 Resumen de cambios:');
    console.log('  - Bodegas ahora pertenecen directamente a Sedes');
    console.log('  - Se eliminó la columna oficinaId de bodegas');
    console.log('  - Se eliminó la columna usuarioOficina de usuarios');
    console.log('  - Los usuarios con oficina fueron migrados a su sede correspondiente');

  } catch (error) {
    console.error('❌ Error al ejecutar la migración:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nConexión cerrada');
    }
  }
}

runMigration();

