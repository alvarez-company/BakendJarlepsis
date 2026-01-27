/**
 * Script para limpiar y corregir los roles
 * - Actualiza el enum rolTipo
 * - Corrige los roles existentes
 * - Elimina roles legacy que no se usan
 * Ejecutar: node scripts/fix-roles-cleanup.js
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function fixRolesCleanup() {
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
    console.log(`   Host: ${config.host}:${config.port}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   User: ${config.user}\n`);

    connection = await mysql.createConnection(config);
    console.log('✅ Conexión establecida\n');

    // ============================================
    // 1. ACTUALIZAR ENUM rolTipo
    // ============================================
    console.log('📝 Actualizando enum rolTipo...');
    try {
      await connection.query(`
        ALTER TABLE \`roles\` 
        MODIFY COLUMN \`rolTipo\` ENUM(
          'superadmin', 
          'admin', 
          'administrador', 
          'tecnico', 
          'soldador', 
          'almacenista', 
          'bodega', 
          'bodega-internas', 
          'bodega-redes',
          'empleado', 
          'inventario', 
          'traslados', 
          'devoluciones', 
          'salidas', 
          'entradas', 
          'instalaciones'
        ) NOT NULL
      `);
      console.log('✅ Enum actualizado\n');
    } catch (error) {
      console.warn('⚠️  Error al actualizar enum:', error.message);
    }

    // ============================================
    // 2. ACTUALIZAR ROLES CON TIPO VACÍO
    // ============================================
    console.log('📝 Actualizando roles con tipo vacío...');
    
    const rolesActualizar = [
      { nombre: 'Administrador - Centro Operativo', tipo: 'administrador' },
      { nombre: 'Soldador', tipo: 'soldador' },
      { nombre: 'Almacenista', tipo: 'almacenista' },
      { nombre: 'Bodega Internas', tipo: 'bodega-internas' },
      { nombre: 'Bodega Redes', tipo: 'bodega-redes' },
    ];

    for (const rol of rolesActualizar) {
      try {
        const [result] = await connection.query(`
          UPDATE \`roles\` 
          SET \`rolTipo\` = ?, \`fechaActualizacion\` = NOW()
          WHERE \`rolNombre\` = ?
        `, [rol.tipo, rol.nombre]);
        
        if (result.affectedRows > 0) {
          console.log(`   ✅ ${rol.nombre} -> ${rol.tipo}`);
        } else {
          console.log(`   ⚠️  ${rol.nombre} no encontrado`);
        }
      } catch (error) {
        console.warn(`   ❌ Error al actualizar ${rol.nombre}: ${error.message}`);
      }
    }
    console.log('');

    // ============================================
    // 3. ELIMINAR ROLES LEGACY QUE NO SE USAN
    // ============================================
    console.log('📝 Eliminando roles legacy...');
    
    const rolesEliminar = [
      'Empleado',
      'Encargado de Bodega',
      'Inventario',
      'Traslados',
      'Entradas',
      'Salidas',
      'Devoluciones',
      'Instalaciones',
    ];

    for (const rolNombre of rolesEliminar) {
      try {
        // Primero verificar si el rol tiene usuarios asignados
        const [usuarios] = await connection.query(`
          SELECT COUNT(*) as count 
          FROM \`usuarios\` u
          INNER JOIN \`roles\` r ON u.usuarioRolId = r.rolId
          WHERE r.rolNombre = ?
        `, [rolNombre]);

        if (usuarios[0].count > 0) {
          console.log(`   ⚠️  ${rolNombre} tiene ${usuarios[0].count} usuario(s) asignado(s), no se puede eliminar`);
        } else {
          const [result] = await connection.query(`
            DELETE FROM \`roles\` WHERE \`rolNombre\` = ?
          `, [rolNombre]);
          
          if (result.affectedRows > 0) {
            console.log(`   ✅ ${rolNombre} eliminado`);
          } else {
            console.log(`   ⚠️  ${rolNombre} no encontrado`);
          }
        }
      } catch (error) {
        console.warn(`   ❌ Error al eliminar ${rolNombre}: ${error.message}`);
      }
    }
    console.log('');

    // ============================================
    // 4. MOSTRAR ROLES FINALES
    // ============================================
    console.log('📋 Roles finales en la base de datos:');
    const [rolesData] = await connection.query(`
      SELECT rolId, rolNombre, rolTipo, rolEstado 
      FROM \`roles\` 
      ORDER BY rolId
    `);
    
    console.log('┌─────┬─────────────────────────────────────┬───────────────────┬─────────┐');
    console.log('│ ID  │ Nombre                              │ Tipo              │ Estado  │');
    console.log('├─────┼─────────────────────────────────────┼───────────────────┼─────────┤');
    for (const rol of rolesData) {
      const id = String(rol.rolId).padEnd(3);
      const nombre = rol.rolNombre.substring(0, 35).padEnd(35);
      const tipo = (rol.rolTipo || '(vacío)').padEnd(17);
      const estado = rol.rolEstado ? 'Activo' : 'Inactivo';
      console.log(`│ ${id} │ ${nombre} │ ${tipo} │ ${estado.padEnd(7)} │`);
    }
    console.log('└─────┴─────────────────────────────────────┴───────────────────┴─────────┘');

    console.log('\n✅ Proceso completado exitosamente\n');

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

fixRolesCleanup();
