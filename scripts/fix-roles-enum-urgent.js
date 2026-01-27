/**
 * Script urgente para corregir el enum rolTipo y agregar todos los roles
 * Ejecutar: node scripts/fix-roles-enum-urgent.js
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function fixRolesEnum() {
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
    // 1. MOSTRAR ENUM ACTUAL
    // ============================================
    console.log('📝 Verificando enum rolTipo actual...');
    const [columnInfo] = await connection.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'roles'
        AND COLUMN_NAME = 'rolTipo'
    `);

    if (columnInfo.length > 0) {
      console.log(`   Valores actuales: ${columnInfo[0].COLUMN_TYPE}\n`);
    }

    // ============================================
    // 2. ACTUALIZAR ENUM rolTipo
    // ============================================
    console.log('📝 Actualizando enum rolTipo con todos los valores...');
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
      console.log('✅ Enum rolTipo actualizado correctamente\n');
    } catch (error) {
      console.error('❌ Error al actualizar enum:', error.message);
      console.log('⚠️  Continuando con la inserción de roles...\n');
    }

    // ============================================
    // 3. INSERTAR/ACTUALIZAR TODOS LOS ROLES
    // ============================================
    console.log('📝 Insertando/actualizando roles...');
    const roles = [
      { 
        nombre: 'Super Administrador', 
        tipo: 'superadmin', 
        descripcion: 'Administrador con todos los permisos incluyendo cambio de roles' 
      },
      { 
        nombre: 'Administrador', 
        tipo: 'admin', 
        descripcion: 'Administrador de oficina con permisos completos excepto cambio de roles' 
      },
      { 
        nombre: 'Administrador - Centro Operativo', 
        tipo: 'administrador', 
        descripcion: 'Usuario con acceso de solo lectura a la información del centro operativo. No puede editar ni eliminar datos.' 
      },
      { 
        nombre: 'Técnico', 
        tipo: 'tecnico', 
        descripcion: 'Usuario técnico con acceso a aplicación móvil y instalaciones asignadas' 
      },
      { 
        nombre: 'Soldador', 
        tipo: 'soldador', 
        descripcion: 'Rol para personal de campo especializado en soldadura. Acceso principalmente a la aplicación móvil.' 
      },
      { 
        nombre: 'Almacenista', 
        tipo: 'almacenista', 
        descripcion: 'Puede gestionar entradas, salidas, asignaciones, devoluciones y traslados. Puede ver instalaciones y aprobar material, pero no puede editar, eliminar ni cambiar estado de instalaciones.' 
      },
      { 
        nombre: 'Bodega Internas', 
        tipo: 'bodega-internas', 
        descripcion: 'Puede gestionar instalaciones, proyectos, usuarios y tipos de instalaciones. No puede asignar material. La información no se cruza con Bodega Redes.' 
      },
      { 
        nombre: 'Bodega Redes', 
        tipo: 'bodega-redes', 
        descripcion: 'Puede gestionar instalaciones, proyectos, usuarios y tipos de instalaciones. No puede asignar material. La información no se cruza con Bodega Internas.' 
      },
    ];

    for (const rol of roles) {
      try {
        const [result] = await connection.query(`
          INSERT INTO \`roles\` 
            (\`rolNombre\`, \`rolTipo\`, \`rolDescripcion\`, \`rolEstado\`, \`fechaCreacion\`, \`fechaActualizacion\`)
          VALUES (?, ?, ?, 1, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            \`rolTipo\` = VALUES(\`rolTipo\`),
            \`rolDescripcion\` = VALUES(\`rolDescripcion\`),
            \`rolEstado\` = 1,
            \`fechaActualizacion\` = NOW()
        `, [rol.nombre, rol.tipo, rol.descripcion]);
        
        if (result.affectedRows > 0) {
          console.log(`   ✅ ${rol.nombre} (${rol.tipo})`);
        }
      } catch (error) {
        console.warn(`   ❌ Error al insertar rol ${rol.nombre}: ${error.message}`);
      }
    }
    console.log(`\n✅ ${roles.length} roles procesados\n`);

    // ============================================
    // 4. MOSTRAR ROLES EN LA BASE DE DATOS
    // ============================================
    console.log('📋 Roles en la base de datos:');
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
      const nombre = rol.rolNombre.padEnd(35);
      const tipo = (rol.rolTipo || '').padEnd(17);
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

fixRolesEnum();
