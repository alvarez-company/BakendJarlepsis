#!/usr/bin/env node
/**
 * Seed único: deja la base de datos funcional después de un reinicio.
 * Incluye: roles, tipos de documento, Colombia, estados (instalación/cliente/movimiento/traslado),
 * unidades de medida, tablas de auditoría, clasificaciones, numeros_medidor,
 * tipos de instalación/proyecto, categorías y usuario superadmin.
 *
 * Uso: node scripts/seed-full.js
 * O:   npm run seed
 *
 * Requiere: .env con DB_* y opcionalmente ADMIN_*
 * Asume: migraciones TypeORM ya ejecutadas (tablas base creadas).
 */

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const MIGRATIONS_DIR = path.resolve(__dirname, '../src/migrations');

function runSqlFile(connection, filename) {
  const filepath = path.join(MIGRATIONS_DIR, filename);
  if (!fs.existsSync(filepath)) return false;
  const sql = fs.readFileSync(filepath, 'utf8');
  return connection.query(sql);
}

const ROLES = [
  { rolNombre: 'Super Administrador', rolTipo: 'superadmin', rolDescripcion: 'Administrador con todos los permisos incluyendo cambio de roles' },
  { rolNombre: 'Administrador', rolTipo: 'admin', rolDescripcion: 'Administrador de oficina con permisos completos excepto cambio de roles' },
  { rolNombre: 'Administrador - Centro Operativo', rolTipo: 'administrador', rolDescripcion: 'Usuario con acceso de solo lectura a la información del centro operativo. No puede editar ni eliminar datos.' },
  { rolNombre: 'Administrador de Internas', rolTipo: 'admin-internas', rolDescripcion: 'Mismos permisos que administrador pero con acceso solo a bodegas de tipo internas de su centro operativo.' },
  { rolNombre: 'Administrador de Redes', rolTipo: 'admin-redes', rolDescripcion: 'Mismos permisos que administrador pero con acceso solo a bodegas de tipo redes de su centro operativo.' },
  { rolNombre: 'Técnico', rolTipo: 'tecnico', rolDescripcion: 'Usuario técnico con acceso a aplicación móvil y instalaciones asignadas' },
  { rolNombre: 'Soldador', rolTipo: 'soldador', rolDescripcion: 'Rol para personal de campo especializado en soldadura. Acceso principalmente a la aplicación móvil.' },
  { rolNombre: 'Almacenista', rolTipo: 'almacenista', rolDescripcion: 'Puede gestionar entradas, salidas, asignaciones, devoluciones y traslados. Puede ver instalaciones y aprobar material.' },
  { rolNombre: 'Bodega Internas', rolTipo: 'bodega-internas', rolDescripcion: 'Puede gestionar instalaciones, proyectos, usuarios y tipos de instalaciones. No puede asignar material. La información no se cruza con Bodega Redes.' },
  { rolNombre: 'Bodega Redes', rolTipo: 'bodega-redes', rolDescripcion: 'Puede gestionar instalaciones, proyectos, usuarios y tipos de instalaciones. No puede asignar material. La información no se cruza con Bodega Internas.' },
];

const TIPOS_DOCUMENTO = [
  { codigo: 'CC', nombre: 'Cédula de Ciudadanía', descripcion: 'Documento de identidad para ciudadanos colombianos mayores de edad' },
  { codigo: 'CE', nombre: 'Cédula de Extranjería', descripcion: 'Documento de identidad para extranjeros residentes en Colombia' },
  { codigo: 'NUIP', nombre: 'Número Único de Identificación Personal', descripcion: 'Número único de identificación personal' },
  { codigo: 'SIC', nombre: 'SIC', descripcion: 'Sistema de Identificación de Clientes' },
  { codigo: 'CI', nombre: 'Certificado Instalador', descripcion: 'Certificado de instalador para técnicos (alfanumérico)' },
  { codigo: 'CS', nombre: 'Certificado Soldador', descripcion: 'Certificado de soldador para personal especializado en soldadura (alfanumérico)' },
];

async function run() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'jarlepsisdev';

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@jarlepsis.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123';
  const adminNombre = process.env.ADMIN_NOMBRE || 'Super';
  const adminApellido = process.env.ADMIN_APELLIDO || 'Admin';
  const adminDocumento = process.env.ADMIN_DOCUMENTO || '9999999999';

  console.log('🌱 Seed único - Dejando la base de datos funcional\n');
  console.log('📋 Configuración:');
  console.log(`   DB: ${host}:${port}/${database}`);
  console.log(`   Admin: ${adminEmail}\n`);

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

    // ─── 1. ROLES ─────────────────────────────────────────────────────
    console.log('👥 Insertando roles...');
    for (const rol of ROLES) {
      await connection.execute(
        `INSERT INTO roles (rolNombre, rolTipo, rolDescripcion, rolEstado, fechaCreacion, fechaActualizacion)
         VALUES (?, ?, ?, 1, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           rolTipo = VALUES(rolTipo),
           rolDescripcion = VALUES(rolDescripcion),
           rolEstado = 1,
           fechaActualizacion = NOW()`,
        [rol.rolNombre, rol.rolTipo, rol.rolDescripcion]
      );
    }
    console.log(`   ✅ ${ROLES.length} roles\n`);

    // ─── 2. TIPOS DE DOCUMENTO (tabla puede no existir si migración no la creó) ───
    const [tiposDocTable] = await connection.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tipos_documentos_identidad'`,
      [database]
    );
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
          UNIQUE INDEX \`IDX_tipoDocumentoCodigo\` (\`tipoDocumentoCodigo\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('   ✅ Tabla creada\n');
    }
    console.log('📝 Insertando tipos de documento...');
    for (const t of TIPOS_DOCUMENTO) {
      await connection.query(
        `INSERT INTO \`tipos_documentos_identidad\` 
          (\`tipoDocumentoCodigo\`, \`tipoDocumentoNombre\`, \`tipoDocumentoDescripcion\`, \`tipoDocumentoEstado\`)
         VALUES (?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE
           \`tipoDocumentoNombre\` = VALUES(\`tipoDocumentoNombre\`),
           \`tipoDocumentoDescripcion\` = VALUES(\`tipoDocumentoDescripcion\`),
           \`tipoDocumentoEstado\` = 1,
           \`fechaActualizacion\` = NOW()`,
        [t.codigo, t.nombre, t.descripcion]
      );
    }
    console.log(`   ✅ ${TIPOS_DOCUMENTO.length} tipos de documento\n`);

    // ─── 3. COLOMBIA (países, departamentos, municipios) ─────────────────
    const colombiaPath = path.resolve(__dirname, '../src/migrations/seed_colombia.sql');
    if (fs.existsSync(colombiaPath)) {
      console.log('📦 Cargando datos de Colombia...');
      const sql = fs.readFileSync(colombiaPath, 'utf8');
      await connection.query(sql);
      console.log('   ✅ Colombia cargado\n');
    } else {
      console.log('⚠️  seed_colombia.sql no encontrado, se omite\n');
    }

    // ─── 4. ESTADOS (instalación, cliente, movimiento, traslado) ───────
    console.log('📦 Creando tablas de estados y datos...');
    try {
      await runSqlFile(connection, '2025-01-XX_create_estados_tables.sql');
      console.log('   ✅ Estados (instalación, cliente, movimiento, traslado)\n');
    } catch (e) {
      console.log('   ⚠️  Estados: ' + (e.message || e) + '\n');
    }

    // ─── 5. UNIDADES DE MEDIDA ─────────────────────────────────────────
    const [unidadesTable] = await connection.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'unidades_medida'`,
      [database]
    );
    if (unidadesTable.length === 0) {
      console.log('📦 Creando tabla unidades_medida...');
      await connection.query(`
        CREATE TABLE \`unidades_medida\` (
          \`unidadMedidaId\` INT NOT NULL AUTO_INCREMENT,
          \`unidadMedidaNombre\` VARCHAR(255) NOT NULL,
          \`unidadMedidaSimbolo\` VARCHAR(255) NULL,
          \`unidadMedidaEstado\` TINYINT NOT NULL DEFAULT 1,
          \`usuarioRegistra\` INT NULL,
          \`fechaCreacion\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`fechaActualizacion\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`unidadMedidaId\`),
          UNIQUE KEY \`unidadMedidaNombre\` (\`unidadMedidaNombre\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('   ✅ Tabla creada\n');
    }
    console.log('📦 Insertando unidades de medida...');
    try {
      await connection.query(`
        INSERT INTO \`unidades_medida\` (\`unidadMedidaNombre\`, \`unidadMedidaSimbolo\`, \`unidadMedidaEstado\`, \`fechaCreacion\`, \`fechaActualizacion\`)
        VALUES
          ('Unidad', 'u', 1, NOW(), NOW()),
          ('Kilogramo', 'kg', 1, NOW(), NOW()),
          ('Gramo', 'g', 1, NOW(), NOW()),
          ('Litro', 'l', 1, NOW(), NOW()),
          ('Metro', 'm', 1, NOW(), NOW()),
          ('Caja', 'caja', 1, NOW(), NOW()),
          ('Paquete', 'paq', 1, NOW(), NOW())
        ON DUPLICATE KEY UPDATE \`unidadMedidaNombre\` = \`unidadMedidaNombre\`
      `);
      console.log('   ✅ Unidades de medida\n');
    } catch (e) {
      console.log('   ⚠️  Unidades de medida: ' + (e.message || e) + '\n');
    }

    // ─── 6. TABLAS DE AUDITORÍA ────────────────────────────────────────
    console.log('📦 Asegurando tablas de auditoría...');
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`auditoria_eliminaciones\` (
          \`auditoriaId\` INT NOT NULL AUTO_INCREMENT,
          \`tipoEntidad\` ENUM('movimiento', 'instalacion', 'traslado', 'asignacion') NOT NULL,
          \`entidadId\` INT NOT NULL,
          \`datosEliminados\` JSON NULL,
          \`motivo\` TEXT NULL,
          \`usuarioId\` INT NOT NULL,
          \`observaciones\` TEXT NULL,
          \`fechaEliminacion\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`auditoriaId\`),
          INDEX \`idx_tipo_entidad\` (\`tipoEntidad\`),
          INDEX \`idx_entidad_id\` (\`entidadId\`),
          INDEX \`idx_usuario_id\` (\`usuarioId\`),
          INDEX \`idx_fecha_eliminacion\` (\`fechaEliminacion\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      await runSqlFile(connection, '2025-01-XX_create_auditoria_inventario.sql');
      console.log('   ✅ auditoria_eliminaciones, auditoria_inventario\n');
    } catch (e) {
      console.log('   ⚠️  Auditoría: ' + (e.message || e) + '\n');
    }

    // ─── 7. CLASIFICACIONES (tabla) ────────────────────────────────────
    try {
      await runSqlFile(connection, '2025-11-19_create_clasificaciones.sql');
      console.log('📦 Tabla clasificaciones verificada\n');
    } catch (e) {
      console.log('   ⚠️  Clasificaciones: ' + (e.message || e) + '\n');
    }

    // ─── 8. NUMEROS_MEDIDOR (tabla) ────────────────────────────────────
    try {
      await runSqlFile(connection, '2025-01-XX_create_numeros_medidor_table.sql');
      console.log('📦 Tabla numeros_medidor verificada\n');
    } catch (e) {
      console.log('   ⚠️  numeros_medidor: ' + (e.message || e) + '\n');
    }

    // ─── 9. TIPOS DE INSTALACIÓN ───────────────────────────────────────
    console.log('📦 Insertando tipos de instalación...');
    await connection.query(`
      INSERT IGNORE INTO tipos_instalacion (tipoInstalacionNombre, usuarioRegistra, fechaCreacion, fechaActualizacion) VALUES
      ('Instalación Nueva', 1, NOW(), NOW()),
      ('Reconexión', 1, NOW(), NOW()),
      ('Cambio de Medidor', 1, NOW(), NOW()),
      ('Reparación', 1, NOW(), NOW())
    `);
    console.log('   ✅ Tipos de instalación\n');

    // ─── 10. TIPOS DE PROYECTO ─────────────────────────────────────────
    console.log('📦 Insertando tipos de proyecto...');
    await connection.query(`
      INSERT IGNORE INTO tipos_proyecto (tipoProyectoNombre, tipoProyectoDescripcion, tipoProyectoEstado, fechaCreacion, fechaActualizacion) VALUES
      ('Residencial', 'Proyectos para viviendas residenciales', 1, NOW(), NOW()),
      ('Comercial', 'Proyectos para establecimientos comerciales', 1, NOW(), NOW()),
      ('Industrial', 'Proyectos para instalaciones industriales', 1, NOW(), NOW())
    `);
    console.log('   ✅ Tipos de proyecto\n');

    // ─── 11. CATEGORÍAS ───────────────────────────────────────────────
    console.log('📦 Insertando categorías...');
    await connection.query(`
      INSERT IGNORE INTO categorias (categoriaNombre, categoriaDescripcion, categoriaCodigo, categoriaEstado, fechaCreacion, fechaActualizacion) VALUES
      ('Medidores', 'Equipos de medición', 'CAT-001', 1, NOW(), NOW()),
      ('Accesorios', 'Accesorios de instalación', 'CAT-002', 1, NOW(), NOW()),
      ('Herramientas', 'Herramientas de trabajo', 'CAT-003', 1, NOW(), NOW())
    `);
    const [catRoot] = await connection.query('SELECT categoriaId FROM categorias WHERE categoriaCodigo = ? LIMIT 1', ['CAT-001']);
    if (catRoot.length > 0) {
      const padreId = catRoot[0].categoriaId;
      await connection.query(
        `INSERT IGNORE INTO categorias (categoriaNombre, categoriaDescripcion, categoriaCodigo, categoriaPadreId, categoriaEstado, fechaCreacion, fechaActualizacion) VALUES
         ('Medidores de Agua', 'Medidores para agua potable', 'CAT-001-001', ?, 1, NOW(), NOW()),
         ('Medidores de Energía', 'Medidores eléctricos', 'CAT-001-002', ?, 1, NOW(), NOW()),
         ('Medidores de Gas', 'Medidores para gas natural', 'CAT-001-003', ?, 1, NOW(), NOW())`,
        [padreId, padreId, padreId]
      );
    }
    console.log('   ✅ Categorías\n');

    // ─── 12. USUARIO SUPERADMIN ────────────────────────────────────────
    console.log('👤 Creando usuario superadmin...');
    const [superAdminRole] = await connection.execute(
      'SELECT rolId FROM roles WHERE rolTipo = ? LIMIT 1',
      ['superadmin']
    );
    if (superAdminRole.length === 0) {
      throw new Error('No se encontró el rol superadmin. Ejecuta el seed después de las migraciones.');
    }
    const superAdminRolId = superAdminRole[0].rolId;
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    await connection.execute(
      `INSERT INTO usuarios (
        usuarioRolId, usuarioNombre, usuarioApellido, usuarioCorreo, usuarioDocumento,
        usuarioContrasena, usuarioEstado, fechaCreacion, fechaActualizacion
      ) VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        usuarioRolId = VALUES(usuarioRolId),
        usuarioContrasena = VALUES(usuarioContrasena),
        usuarioEstado = 1,
        fechaActualizacion = NOW()`,
      [superAdminRolId, adminNombre, adminApellido, adminEmail, adminDocumento, passwordHash]
    );
    console.log('   ✅ Usuario superadmin creado/actualizado\n');

    // ─── RESUMEN ───────────────────────────────────────────────────────
    const counts = {};
    const tables = ['paises', 'departamentos', 'municipios', 'roles', 'estados_instalacion', 'estados_movimiento', 'unidades_medida', 'tipos_instalacion', 'categorias', 'usuarios'];
    for (const table of tables) {
      try {
        const [rows] = await connection.execute(`SELECT COUNT(*) AS c FROM \`${table}\``);
        counts[table] = rows[0].c;
      } catch (_) {
        counts[table] = '-';
      }
    }
    try {
      const [r] = await connection.execute('SELECT COUNT(*) AS c FROM auditoria_eliminaciones');
      counts.auditoria_eliminaciones = r[0].c;
    } catch (_) {
      counts.auditoria_eliminaciones = '-';
    }
    try {
      const [r] = await connection.execute('SELECT COUNT(*) AS c FROM auditoria_inventario');
      counts.auditoria_inventario = r[0].c;
    } catch (_) {
      counts.auditoria_inventario = '-';
    }

    console.log('📊 Resumen:');
    console.log(`   Países: ${counts.paises} | Departamentos: ${counts.departamentos} | Municipios: ${counts.municipios}`);
    console.log(`   Roles: ${counts.roles} | Estados instalación: ${counts.estados_instalacion} | Unidades medida: ${counts.unidades_medida}`);
    console.log(`   Tipos instalación: ${counts.tipos_instalacion} | Categorías: ${counts.categorias} | Usuarios: ${counts.usuarios}`);
    console.log(`   Auditoría eliminaciones: ${counts.auditoria_eliminaciones} | Auditoría inventario: ${counts.auditoria_inventario}`);
    console.log('\n✅ Seed completado. Base de datos lista para usar.\n');
    console.log('📝 Credenciales:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}\n`);
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.sql) console.error('SQL:', err.sql);
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end().catch(() => {});
  }
}

run();
