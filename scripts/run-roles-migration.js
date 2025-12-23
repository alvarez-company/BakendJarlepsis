const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  let connection;
  
  try {
    // Configuración de conexión desde variables de entorno
    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'jarlepsisdev',
      multipleStatements: true, // Permite ejecutar múltiples statements
    };

    console.log('🔌 Conectando a la base de datos...');
    console.log(`   Host: ${config.host}:${config.port}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   User: ${config.user}`);
    
    connection = await mysql.createConnection(config);
    console.log('✅ Conexión establecida\n');

    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, '../src/migrations/2025-01-XX_complete_roles_migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Ejecutando migración de roles...\n');
    
    // Ejecutar el script SQL
    const [results] = await connection.query(sql);
    
    console.log('✅ Migración ejecutada exitosamente\n');
    
    // Verificar los roles creados
    console.log('📊 Verificando roles en la base de datos...\n');
    const [roles] = await connection.query(`
      SELECT 
        rolId,
        rolNombre,
        rolTipo,
        rolEstado,
        CASE 
          WHEN rolTipo IN ('superadmin', 'admin', 'administrador', 'almacenista', 'tecnico', 'soldador', 'bodega-internas', 'bodega-redes') 
          THEN 'Principal' 
          ELSE 'Legacy' 
        END AS tipo_rol
      FROM roles
      ORDER BY 
        CASE 
          WHEN rolTipo IN ('superadmin', 'admin', 'administrador', 'almacenista', 'tecnico', 'soldador', 'bodega-internas', 'bodega-redes') 
          THEN 1 
          ELSE 2 
        END,
        rolNombre
    `);

    console.log('📋 Roles en la base de datos:');
    console.log('─'.repeat(80));
    roles.forEach(role => {
      const status = role.rolEstado ? '✅ Activo' : '❌ Inactivo';
      const tipo = role.tipo_rol === 'Principal' ? '🔵 Principal' : '⚪ Legacy';
      console.log(`${tipo} | ${role.rolTipo.padEnd(20)} | ${role.rolNombre.padEnd(35)} | ${status}`);
    });
    console.log('─'.repeat(80));
    console.log(`\n✅ Total de roles: ${roles.length}`);
    console.log(`🔵 Roles principales: ${roles.filter(r => r.tipo_rol === 'Principal').length}`);
    console.log(`⚪ Roles legacy: ${roles.filter(r => r.tipo_rol === 'Legacy').length}\n`);

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
      console.log('🔌 Conexión cerrada');
    }
  }
}

// Ejecutar la migración
runMigration();

