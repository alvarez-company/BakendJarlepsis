const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function runMigration() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'jarlepsisdev';

  console.log('🚀 Ejecutando migración de auditoría de eliminaciones...');
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
      connectTimeout: 15000,
    });

    console.log('✅ Conectado a la base de datos');

    // Leer el archivo SQL
    const sqlFile = path.join(__dirname, '../src/migrations/2025-11-20_create_auditoria_eliminaciones.sql');
    
    if (!fs.existsSync(sqlFile)) {
      console.error(`❌ Archivo no encontrado: ${sqlFile}`);
      process.exitCode = 1;
      return;
    }

    const sql = fs.readFileSync(sqlFile, 'utf8');
    console.log('📄 Leyendo archivo de migración...');
    console.log(`   Archivo: ${sqlFile}`);

    // Ejecutar la migración
    console.log('⚙️  Ejecutando migración...');
    try {
      await connection.query(sql);
      console.log('✅ Migración ejecutada exitosamente');
    } catch (err) {
      // Si la tabla ya existe, es un error esperado
      if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.message?.includes('already exists')) {
        console.log('⚠️  La tabla ya existe: auditoria_eliminaciones');
        console.log('   La migración ya fue aplicada anteriormente');
      } else {
        throw err;
      }
    }

    // Verificar que la tabla se haya creado
    console.log('\n🔍 Verificando tabla creada...');
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'auditoria_eliminaciones'
    `, [database]);
    
    if (tables.length > 0) {
      console.log('✅ Tabla auditoria_eliminaciones existe');
      
      // Verificar columnas
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? 
          AND TABLE_NAME = 'auditoria_eliminaciones'
        ORDER BY ORDINAL_POSITION
      `, [database]);
      
      console.log('\n📊 Columnas de la tabla:');
      columns.forEach(col => {
        console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE}, ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });
    } else {
      console.log('⚠️  La tabla no se encontró después de la migración');
    }

    console.log('\n✅ Migración completada exitosamente');

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

runMigration();

