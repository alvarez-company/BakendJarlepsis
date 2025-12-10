const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function runInstalacionDatetimeMigration() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'jarlepsisdev';

  console.log('🔧 Ejecutando migración para separar fecha y horas de instalación...\n');
  console.log('Configuración de BD:', { host, port, user, database, password: password ? '***' : '' });

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

    const migrationFile = path.resolve(__dirname, '../src/migrations/2025-11-20_separate_instalacion_datetime.sql');
    
    if (!fs.existsSync(migrationFile)) {
      console.error(`❌ Archivo de migración no encontrado: ${migrationFile}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(migrationFile, 'utf8');
    console.log(`\n📄 Ejecutando migración: ${migrationFile}\n`);

    // Ejecutar el SQL
    const [results] = await connection.query(sql);
    
    console.log('✅ Migración ejecutada exitosamente\n');
    
    // Verificar que las columnas se hayan agregado
    console.log('🔍 Verificando columnas agregadas...\n');
    
    const columns = [
      { column: 'instalacionFecha', type: 'date' },
      { column: 'instalacionHoraInicio', type: 'time' },
      { column: 'instalacionHoraFinal', type: 'time' },
    ];

    for (const { column, type } of columns) {
      const [cols] = await connection.query(
        `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'instalaciones' AND COLUMN_NAME = ?`,
        [database, column]
      );

      if (cols.length > 0) {
        console.log(`   ✅ instalaciones.${column} - ${cols[0].DATA_TYPE} (${cols[0].IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
      } else {
        console.log(`   ⚠️  instalaciones.${column} - NO ENCONTRADA`);
      }
    }

    // Verificar datos migrados
    const [migrated] = await connection.query(
      `SELECT COUNT(*) as total FROM instalaciones WHERE instalacionFecha IS NOT NULL`
    );
    console.log(`\n📊 Instalaciones con fecha migrada: ${migrated[0].total}`);

    console.log('\n✅ Migración completada exitosamente');
  } catch (err) {
    console.error('❌ Error ejecutando migración:', err.message);
    if (err.sql) {
      console.error('SQL:', err.sql);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end().catch(() => {});
    }
  }
}

runInstalacionDatetimeMigration();

