const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runFechaMetrogasMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true, // Permitir múltiples statements
  });

  console.log('🔌 Conectando a la base de datos...');
  console.log('✅ Conexión establecida');

  try {
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, '../src/migrations/2025-01-XX_update_fecha_asignacion_metrogas_not_null.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('\n📝 Ejecutando migración...');
    
    // Ejecutar el SQL
    const [results] = await connection.query(sql);
    
    console.log('✅ Migración ejecutada exitosamente');
    console.log('📊 Resultados:', results);
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await connection.end();
    console.log('🔌 Conexión cerrada');
  }
}

runFechaMetrogasMigration()
  .then(() => {
    console.log('\n✅ Proceso completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en el proceso:', error);
    process.exit(1);
  });

