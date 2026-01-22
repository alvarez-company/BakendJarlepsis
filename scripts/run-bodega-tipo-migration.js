const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  let connection;
  
  try {
    // Crear conexión a la base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || process.env.DB_HOSTNAME || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || process.env.DB_DATABASE || 'jarlepsisdev',
      multipleStatements: true
    });

    console.log('✅ Conectado a la base de datos');
    
    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, '../src/migrations/2025-01-XX_add_bodega_tipo.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Ejecutando migración: add_bodega_tipo');
    
    // Ejecutar la migración
    await connection.query(migrationSQL);
    
    console.log('✅ Migración ejecutada exitosamente');
    console.log('✅ La columna bodegaTipo ha sido agregada a la tabla bodegas');
    
  } catch (error) {
    console.error('❌ Error al ejecutar la migración:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión cerrada');
    }
  }
}

runMigration();
