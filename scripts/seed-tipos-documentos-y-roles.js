/**
 * Script para agregar tipos de documentos de identidad y roles a la base de datos
 * Ejecutar: node scripts/seed-tipos-documentos-y-roles.js
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function seedTiposDocumentosYRoles() {
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
    // 1. CREAR TABLA tipos_documentos_identidad SI NO EXISTE
    // ============================================
    console.log('📝 Verificando tabla tipos_documentos_identidad...');
    const [tiposDocTable] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tipos_documentos_identidad'
    `);

    if (tiposDocTable.length === 0) {
      console.log('📝 Creando tabla tipos_documentos_identidad...');
      await connection.query(`
        CREATE TABLE \`tipos_documentos_identidad\` (
          \`tipoDocumentoId\` INT NOT NULL AUTO_INCREMENT,
          \`tipoDocumentoCodigo\` VARCHAR(10) NOT NULL,
          \`tipoDocumentoNombre\` VARCHAR(100) NOT NULL,
          \`tipoDocumentoDescripcion\` TEXT NULL,
          \`tipoDocumentoEstado\` TINYINT(1) NOT NULL DEFAULT 1,
          \`fechaCreacion\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`fechaActualizacion\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`tipoDocumentoId\`),
          UNIQUE INDEX \`IDX_tipoDocumentoCodigo\` (\`tipoDocumentoCodigo\`),
          INDEX \`IDX_tipoDocumentoEstado\` (\`tipoDocumentoEstado\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Tabla tipos_documentos_identidad creada\n');
    } else {
      console.log('✅ Tabla tipos_documentos_identidad ya existe\n');
    }

    // ============================================
    // 2. INSERTAR TIPOS DE DOCUMENTOS DE IDENTIDAD
    // ============================================
    console.log('📝 Insertando tipos de documentos de identidad...');
    const tiposDocumentos = [
      { codigo: 'CC', nombre: 'Cédula de Ciudadanía', descripcion: 'Documento de identidad para ciudadanos colombianos mayores de edad' },
      { codigo: 'CE', nombre: 'Cédula de Extranjería', descripcion: 'Documento de identidad para extranjeros residentes en Colombia' },
      { codigo: 'NUIP', nombre: 'Número Único de Identificación Personal', descripcion: 'Número único de identificación personal' },
      { codigo: 'SIC', nombre: 'SIC', descripcion: 'Sistema de Identificación de Clientes' },
      { codigo: 'CI', nombre: 'Certificado Instalador', descripcion: 'Certificado de instalador para técnicos (alfanumérico)' },
      { codigo: 'CS', nombre: 'Certificado Soldador', descripcion: 'Certificado de soldador para personal especializado en soldadura (alfanumérico)' },
    ];

    for (const tipo of tiposDocumentos) {
      try {
        await connection.query(`
          INSERT INTO \`tipos_documentos_identidad\` 
            (\`tipoDocumentoCodigo\`, \`tipoDocumentoNombre\`, \`tipoDocumentoDescripcion\`, \`tipoDocumentoEstado\`)
          VALUES (?, ?, ?, 1)
          ON DUPLICATE KEY UPDATE
            \`tipoDocumentoNombre\` = VALUES(\`tipoDocumentoNombre\`),
            \`tipoDocumentoDescripcion\` = VALUES(\`tipoDocumentoDescripcion\`),
            \`tipoDocumentoEstado\` = 1,
            \`fechaActualizacion\` = NOW()
        `, [tipo.codigo, tipo.nombre, tipo.descripcion]);
        console.log(`   ✅ ${tipo.codigo} - ${tipo.nombre}`);
      } catch (error) {
        console.warn(`   ⚠️  Error al insertar ${tipo.codigo}:`, error.message);
      }
    }
    console.log(`✅ ${tiposDocumentos.length} tipos de documentos procesados\n`);

    // ============================================
    // 3. VERIFICAR TABLA roles
    // ============================================
    console.log('📝 Verificando tabla roles...');
    const [rolesTable] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'roles'
    `);

    if (rolesTable.length === 0) {
      console.log('❌ La tabla roles no existe. Ejecuta las migraciones primero.\n');
    } else {
      console.log('✅ Tabla roles existe\n');

      // Verificar si el enum incluye los nuevos valores
      console.log('📝 Verificando columna rolTipo...');
      const [columnInfo] = await connection.query(`
        SELECT COLUMN_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'roles'
          AND COLUMN_NAME = 'rolTipo'
      `);

      if (columnInfo.length > 0) {
        const enumValues = columnInfo[0].COLUMN_TYPE;
        console.log(`   Valores actuales: ${enumValues}\n`);

        // Verificar si faltan valores en el enum
        const missingValues = [];
        const requiredValues = ['superadmin', 'admin', 'administrador', 'tecnico', 'soldador', 'almacenista', 'bodega', 'bodega-internas', 'bodega-redes'];
        
        for (const val of requiredValues) {
          if (!enumValues.includes(`'${val}'`)) {
            missingValues.push(val);
          }
        }

        if (missingValues.length > 0) {
          console.log(`📝 Agregando valores faltantes al enum rolTipo: ${missingValues.join(', ')}`);
          try {
            await connection.query(`
              ALTER TABLE \`roles\` 
              MODIFY COLUMN \`rolTipo\` ENUM(
                'superadmin', 'admin', 'administrador', 'tecnico', 'soldador', 
                'almacenista', 'bodega', 'bodega-internas', 'bodega-redes',
                'empleado', 'inventario', 'traslados', 'devoluciones', 
                'salidas', 'entradas', 'instalaciones'
              ) NOT NULL
            `);
            console.log('✅ Enum rolTipo actualizado\n');
          } catch (error) {
            console.warn('⚠️  No se pudo actualizar el enum:', error.message);
          }
        }
      }

      // ============================================
      // 4. INSERTAR ROLES
      // ============================================
      console.log('📝 Insertando roles...');
      const roles = [
        {
          nombre: 'Super Administrador',
          tipo: 'superadmin',
          descripcion: 'Administrador con todos los permisos incluyendo cambio de roles',
        },
        {
          nombre: 'Administrador',
          tipo: 'admin',
          descripcion: 'Administrador de oficina con permisos completos excepto cambio de roles',
        },
        {
          nombre: 'Administrador - Centro Operativo',
          tipo: 'administrador',
          descripcion: 'Usuario con acceso de solo lectura a la información del centro operativo. No puede editar ni eliminar datos.',
        },
        {
          nombre: 'Técnico',
          tipo: 'tecnico',
          descripcion: 'Usuario técnico con acceso a aplicación móvil y instalaciones asignadas',
        },
        {
          nombre: 'Soldador',
          tipo: 'soldador',
          descripcion: 'Rol para personal de campo especializado en soldadura. Acceso principalmente a la aplicación móvil.',
        },
        {
          nombre: 'Almacenista',
          tipo: 'almacenista',
          descripcion: 'Puede gestionar entradas, salidas, asignaciones, devoluciones y traslados. Puede ver instalaciones y aprobar material, pero no puede editar, eliminar ni cambiar estado de instalaciones.',
        },
        {
          nombre: 'Bodega Internas',
          tipo: 'bodega-internas',
          descripcion: 'Puede gestionar instalaciones, proyectos, usuarios y tipos de instalaciones. No puede asignar material. La información no se cruza con Bodega Redes.',
        },
        {
          nombre: 'Bodega Redes',
          tipo: 'bodega-redes',
          descripcion: 'Puede gestionar instalaciones, proyectos, usuarios y tipos de instalaciones. No puede asignar material. La información no se cruza con Bodega Internas.',
        },
      ];

      for (const rol of roles) {
        try {
          await connection.query(`
            INSERT INTO \`roles\` 
              (\`rolNombre\`, \`rolTipo\`, \`rolDescripcion\`, \`rolEstado\`, \`fechaCreacion\`, \`fechaActualizacion\`)
            VALUES (?, ?, ?, 1, NOW(), NOW())
            ON DUPLICATE KEY UPDATE
              \`rolDescripcion\` = VALUES(\`rolDescripcion\`),
              \`rolEstado\` = 1,
              \`fechaActualizacion\` = NOW()
          `, [rol.nombre, rol.tipo, rol.descripcion]);
          console.log(`   ✅ ${rol.nombre} (${rol.tipo})`);
        } catch (error) {
          console.warn(`   ⚠️  Error al insertar rol ${rol.nombre}:`, error.message);
        }
      }
      console.log(`✅ ${roles.length} roles procesados\n`);
    }

    // ============================================
    // 5. MOSTRAR RESUMEN
    // ============================================
    console.log('📊 RESUMEN:');
    
    const [tiposCount] = await connection.query(`
      SELECT COUNT(*) as count FROM \`tipos_documentos_identidad\`
    `);
    console.log(`   Tipos de documento: ${tiposCount[0].count}`);

    const [rolesCount] = await connection.query(`
      SELECT COUNT(*) as count FROM \`roles\`
    `);
    console.log(`   Roles: ${rolesCount[0].count}`);

    // Mostrar tipos de documento
    console.log('\n📋 Tipos de documento en la base de datos:');
    const [tipos] = await connection.query(`
      SELECT tipoDocumentoCodigo, tipoDocumentoNombre 
      FROM \`tipos_documentos_identidad\` 
      ORDER BY tipoDocumentoId
    `);
    for (const tipo of tipos) {
      console.log(`   ${tipo.tipoDocumentoCodigo} - ${tipo.tipoDocumentoNombre}`);
    }

    // Mostrar roles
    console.log('\n👥 Roles en la base de datos:');
    const [rolesData] = await connection.query(`
      SELECT rolId, rolNombre, rolTipo 
      FROM \`roles\` 
      ORDER BY rolId
    `);
    for (const rol of rolesData) {
      console.log(`   ${rol.rolId}. ${rol.rolNombre} (${rol.rolTipo})`);
    }

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

seedTiposDocumentosYRoles();
