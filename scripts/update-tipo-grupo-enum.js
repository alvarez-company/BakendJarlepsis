/* eslint-disable no-console */
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function updateTipoGrupoEnum() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3307', 10);
  const user = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || 'root';
  const database = process.env.DB_NAME || 'jarlepsisdev';

  console.log('🔄 Actualizando enum tipoGrupo para incluir "directo"...\n');
  console.log(`📋 Configuración: ${host}:${port}/${database}\n`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
    });

    console.log('✅ Conectado a la base de datos\n');

    // Verificar el enum actual
    const [currentEnum] = await connection.execute(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'grupos' 
      AND COLUMN_NAME = 'tipoGrupo'
    `, [database]);

    if (currentEnum.length > 0) {
      console.log(`📊 Enum actual: ${currentEnum[0].COLUMN_TYPE}\n`);
    }

    // Actualizar el enum para incluir 'directo'
    console.log('🔄 Actualizando enum tipoGrupo...');
    await connection.execute(`
      ALTER TABLE \`grupos\` 
      MODIFY COLUMN \`tipoGrupo\` ENUM('general', 'sede', 'oficina', 'bodega', 'instalacion', 'directo') 
      NOT NULL DEFAULT 'general'
    `);

    console.log('✅ Enum actualizado exitosamente\n');

    // Verificar el nuevo enum
    const [newEnum] = await connection.execute(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'grupos' 
      AND COLUMN_NAME = 'tipoGrupo'
    `, [database]);

    if (newEnum.length > 0) {
      console.log(`📊 Nuevo enum: ${newEnum[0].COLUMN_TYPE}\n`);
    }

    console.log('✅ Proceso completado exitosamente\n');
  } catch (error) {
    console.error('❌ Error al actualizar el enum:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión cerrada\n');
    }
  }
}

updateTipoGrupoEnum();

