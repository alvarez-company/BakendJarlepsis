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

  console.log('🚀 Ejecutando migración completa de instalaciones y movimientos...');
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
      multipleStatements: true, // Permitir múltiples statements
    });

    console.log('✅ Conectado a la base de datos');

    // Leer el archivo SQL
    const sqlFile = path.join(__dirname, '../src/migrations/2025-11-20_complete_instalaciones_and_movimientos_structure.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('📄 Leyendo archivo de migración...');
    console.log(`   Archivo: ${sqlFile}`);

    // Ejecutar la migración
    console.log('⚙️  Ejecutando migración...');
    const [results] = await connection.query(sql);

    console.log('✅ Migración ejecutada exitosamente');
    console.log('📊 Resultados:', results);

    // Verificar que las columnas se hayan creado
    console.log('\n🔍 Verificando columnas creadas...');
    
    // Verificar instalaciones
    const [instalacionesCols] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'instalaciones' 
        AND COLUMN_NAME IN ('oficinaId', 'bodegaId', 'estado')
      ORDER BY COLUMN_NAME
    `, [database]);
    
    console.log('   Columnas en instalaciones:', instalacionesCols.map(c => c.COLUMN_NAME).join(', '));

    // Verificar movimientos_inventario
    const [movimientosCols] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'movimientos_inventario' 
        AND COLUMN_NAME IN ('inventarioId', 'movimientoCodigo', 'oficinaId')
      ORDER BY COLUMN_NAME
    `, [database]);
    
    console.log('   Columnas en movimientos_inventario:', movimientosCols.map(c => c.COLUMN_NAME).join(', '));

    // Verificar enum de estado
    const [enumInfo] = await connection.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'instalaciones' 
        AND COLUMN_NAME = 'estado'
    `, [database]);
    
    if (enumInfo.length > 0) {
      console.log('   Enum de estado:', enumInfo[0].COLUMN_TYPE);
      if (enumInfo[0].COLUMN_TYPE.includes('finalizada')) {
        console.log('   ✅ El enum incluye "finalizada"');
      } else {
        console.log('   ⚠️  El enum NO incluye "finalizada"');
      }
    }

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

