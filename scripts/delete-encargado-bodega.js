/**
 * Script para eliminar el rol "Encargado de Bodega"
 * - Reasigna usuarios a "Almacenista" antes de eliminar
 * Ejecutar: node scripts/delete-encargado-bodega.js
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function deleteEncargadoBodega() {
  let connection;

  try {
    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'jarlepsisdev',
    };

    console.log('🔌 Conectando a la base de datos...');
    connection = await mysql.createConnection(config);
    console.log('✅ Conexión establecida\n');

    // 1. Buscar el rol "Encargado de Bodega"
    console.log('📝 Buscando rol "Encargado de Bodega"...');
    const [rolEncargado] = await connection.query(`
      SELECT rolId, rolNombre FROM \`roles\` WHERE \`rolNombre\` = 'Encargado de Bodega'
    `);

    if (rolEncargado.length === 0) {
      console.log('✅ El rol "Encargado de Bodega" no existe\n');
      return;
    }

    const encargadoId = rolEncargado[0].rolId;
    console.log(`   Encontrado con ID: ${encargadoId}\n`);

    // 2. Buscar el rol "Almacenista" para reasignar usuarios
    console.log('📝 Buscando rol "Almacenista"...');
    const [rolAlmacenista] = await connection.query(`
      SELECT rolId, rolNombre FROM \`roles\` WHERE \`rolNombre\` = 'Almacenista'
    `);

    if (rolAlmacenista.length === 0) {
      console.log('❌ El rol "Almacenista" no existe. Creándolo...');
      await connection.query(`
        INSERT INTO \`roles\` (\`rolNombre\`, \`rolTipo\`, \`rolDescripcion\`, \`rolEstado\`)
        VALUES ('Almacenista', 'almacenista', 'Puede gestionar entradas, salidas, asignaciones, devoluciones y traslados.', 1)
      `);
      const [nuevoRol] = await connection.query(`SELECT LAST_INSERT_ID() as id`);
      var almacenistaId = nuevoRol[0].id;
    } else {
      var almacenistaId = rolAlmacenista[0].rolId;
    }
    console.log(`   Almacenista ID: ${almacenistaId}\n`);

    // 3. Verificar usuarios con el rol "Encargado de Bodega"
    console.log('📝 Verificando usuarios con rol "Encargado de Bodega"...');
    const [usuarios] = await connection.query(`
      SELECT usuarioId, usuarioNombre, usuarioCorreo 
      FROM \`usuarios\` 
      WHERE \`usuarioRolId\` = ?
    `, [encargadoId]);

    if (usuarios.length > 0) {
      console.log(`   Encontrados ${usuarios.length} usuario(s):`);
      for (const u of usuarios) {
        console.log(`     - ${u.usuarioNombre} (${u.usuarioCorreo})`);
      }
      console.log('');

      // 4. Reasignar usuarios a "Almacenista"
      console.log('📝 Reasignando usuarios a "Almacenista"...');
      const [result] = await connection.query(`
        UPDATE \`usuarios\` 
        SET \`usuarioRolId\` = ?, \`fechaActualizacion\` = NOW()
        WHERE \`usuarioRolId\` = ?
      `, [almacenistaId, encargadoId]);
      console.log(`   ✅ ${result.affectedRows} usuario(s) reasignado(s)\n`);
    } else {
      console.log('   No hay usuarios con este rol\n');
    }

    // 5. Eliminar el rol "Encargado de Bodega"
    console.log('📝 Eliminando rol "Encargado de Bodega"...');
    const [deleteResult] = await connection.query(`
      DELETE FROM \`roles\` WHERE \`rolId\` = ?
    `, [encargadoId]);

    if (deleteResult.affectedRows > 0) {
      console.log('✅ Rol "Encargado de Bodega" eliminado\n');
    } else {
      console.log('⚠️  No se pudo eliminar el rol\n');
    }

    // 6. Mostrar roles finales
    console.log('📋 Roles actuales en la base de datos:');
    const [rolesData] = await connection.query(`
      SELECT rolId, rolNombre, rolTipo 
      FROM \`roles\` 
      ORDER BY rolId
    `);
    
    for (const rol of rolesData) {
      console.log(`   ${rol.rolId}. ${rol.rolNombre} (${rol.rolTipo || 'sin tipo'})`);
    }

    console.log('\n✅ Proceso completado\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión cerrada');
    }
  }
}

deleteEncargadoBodega();
