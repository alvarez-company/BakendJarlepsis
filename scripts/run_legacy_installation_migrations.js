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

  console.log('🚀 Ejecutando migraciones para estados legacy de instalaciones...');
  console.log('Using DB config:', { host, port, user, database, password: password ? '***' : '' });

  const migrations = [
    path.resolve(__dirname, '../src/migrations/2025-01-XX_add_legacy_installation_notification_types.sql'),
    path.resolve(__dirname, '../src/migrations/2025-01-XX_add_fechas_estados_legacy_instalaciones.sql'),
  ];

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

    console.log('✅ Conectado a la base de datos\n');

    for (const migrationFile of migrations) {
      if (!fs.existsSync(migrationFile)) {
        console.log(`❌ Archivo no encontrado: ${migrationFile}`);
        process.exitCode = 1;
        return;
      }

      const sql = fs.readFileSync(migrationFile, 'utf8');
      const fileName = path.basename(migrationFile);
      console.log(`📄 Ejecutando migración: ${fileName}`);
      
      try {
        const [results] = await connection.query(sql);
        console.log(`✅ Migración completada: ${fileName}`);
        
        // Mostrar resultados si hay
        if (Array.isArray(results) && results.length > 0) {
          const lastResult = results[results.length - 1];
          if (lastResult && Array.isArray(lastResult) && lastResult.length > 0) {
            const message = lastResult[0];
            if (message && message.resultado) {
              console.log(`   ${message.resultado}`);
            }
          }
        }
        console.log('');
      } catch (err) {
        // Si la columna ya existe o el enum ya tiene los valores, es un error esperado
        if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_ENTRY') {
          console.log(`⚠️  La migración ya fue aplicada: ${fileName}`);
        } else if (err.message && err.message.includes('already exists')) {
          console.log(`⚠️  La migración ya fue aplicada: ${fileName}`);
        } else {
          console.error(`❌ Error en migración ${fileName}:`, err.message);
          if (err.sqlMessage) {
            console.error('   SQL Error:', err.sqlMessage);
          }
          throw err;
        }
        console.log('');
      }
    }

    // Verificar que las columnas se hayan creado
    console.log('🔍 Verificando columnas creadas...');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'instalaciones' 
        AND COLUMN_NAME IN ('fechaAsignacion', 'fechaConstruccion', 'fechaCertificacion', 'fechaAnulacion', 'fechaNovedad')
      ORDER BY COLUMN_NAME
    `, [database]);
    
    console.log('   Columnas de fecha en instalaciones:', columns.length > 0 ? columns.map(c => c.COLUMN_NAME).join(', ') : 'Ninguna encontrada');

    // Verificar tipos de notificación
    const [notifTypes] = await connection.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'notificaciones' 
        AND COLUMN_NAME = 'tipoNotificacion'
    `, [database]);
    
    if (notifTypes.length > 0) {
      const columnType = notifTypes[0].COLUMN_TYPE;
      const hasLegacyTypes = columnType.includes('instalacion_asignacion') && 
                            columnType.includes('instalacion_construccion') &&
                            columnType.includes('instalacion_certificacion');
      console.log('   Tipos de notificación legacy:', hasLegacyTypes ? '✅ Agregados' : '❌ No encontrados');
    }

    console.log(`\n✅ Todas las migraciones completadas exitosamente`);

  } catch (err) {
    console.error('❌ Error ejecutando migraciones:', err.message);
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

