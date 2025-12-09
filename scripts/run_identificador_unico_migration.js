const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'jarlepsisdev';

  console.log('🚀 Ejecutando migración de identificadorUnico...');
  console.log(`   Host: ${host}:${port}`);
  console.log(`   User: ${user}`);
  console.log(`   DB: ${database}`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      multipleStatements: true,
    });

    console.log('✅ Conectado a la base de datos');

    // Leer el archivo SQL
    const sqlFile = path.join(__dirname, '../src/migrations/2025-11-20_add_identificador_unico.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('📄 Leyendo archivo de migración...');
    console.log(`   Archivo: ${sqlFile}`);

    // Ejecutar la migración
    console.log('⚙️  Ejecutando migración...');
    const [results] = await connection.query(sql);

    console.log('✅ Migración ejecutada exitosamente');

    // Verificar que las columnas se hayan creado
    console.log('\n🔍 Verificando columnas creadas...');
    
    // Verificar instalaciones
    const [instalacionesCols] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'instalaciones' 
        AND COLUMN_NAME = 'identificadorUnico'
    `, [database]);
    
    console.log('   Columnas en instalaciones:', instalacionesCols.length > 0 ? 'identificadorUnico ✅' : 'identificadorUnico ❌');

    // Verificar movimientos_inventario
    const [movimientosCols] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'movimientos_inventario' 
        AND COLUMN_NAME = 'identificadorUnico'
    `, [database]);
    
    console.log('   Columnas en movimientos_inventario:', movimientosCols.length > 0 ? 'identificadorUnico ✅' : 'identificadorUnico ❌');

    // Verificar traslados
    const [trasladosCols] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'traslados' 
        AND COLUMN_NAME = 'identificadorUnico'
    `, [database]);
    
    console.log('   Columnas en traslados:', trasladosCols.length > 0 ? 'identificadorUnico ✅' : 'identificadorUnico ❌');

    console.log('\n✨ Migración completada exitosamente!');

  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

runMigration();

