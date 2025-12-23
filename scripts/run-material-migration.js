const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  let connection;
  
  try {
    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'jarlepsisdev',
      multipleStatements: true,
    };

    console.log('🔌 Conectando a la base de datos...');
    connection = await mysql.createConnection(config);
    console.log('✅ Conexión establecida\n');

    const sqlPath = path.join(__dirname, '../src/migrations/2025-01-XX_add_unique_materialNombre.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Ejecutando migración de índice único para materialNombre...\n');
    const [results] = await connection.query(sql);
    
    console.log('✅ Migración ejecutada exitosamente\n');
    
    // Verificar que el índice se creó
    const [indexes] = await connection.query(`
      SELECT INDEX_NAME, COLUMN_NAME 
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'materiales'
        AND COLUMN_NAME = 'materialNombre'
        AND NON_UNIQUE = 0
    `);

    if (indexes.length > 0) {
      console.log('✅ Índice único verificado:');
      indexes.forEach(idx => {
        console.log(`   - ${idx.INDEX_NAME} en ${idx.COLUMN_NAME}`);
      });
    } else {
      console.log('⚠️  No se encontró el índice único. Puede que ya existiera o hubo un error.');
    }

  } catch (error) {
    console.error('❌ Error ejecutando la migración:');
    console.error(error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

runMigration();

