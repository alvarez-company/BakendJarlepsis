/* eslint-disable no-console */
const { execSync } = require('child_process');
const readline = require('readline');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function resetDatabase() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'jarlepsisdev';

  console.log('🔄 Iniciando reseteo de base de datos...\n');
  console.log('📋 Configuración:');
  console.log(`   Host: ${host}:${port}`);
  console.log(`   Usuario: ${user}`);
  console.log(`   Base de datos: ${database}\n`);
  
  // Advertencia si es una base de datos remota
  const isRemote = host !== '127.0.0.1' && host !== 'localhost' && !host.includes('docker');
  if (isRemote) {
    console.log('⚠️  ADVERTENCIA: Estás intentando resetear una base de datos remota!');
    console.log(`   Host: ${host}`);
    console.log('   Esto eliminará TODOS los datos de la base de datos.\n');
    
    // Si no se pasa --yes como argumento, pedir confirmación
    if (!process.argv.includes('--yes') && !process.argv.includes('-y')) {
      const answer = await askQuestion('¿Estás seguro de que quieres continuar? (yes/no): ');
      if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
        console.log('❌ Operación cancelada por el usuario.\n');
        process.exit(0);
      }
    }
  }

  let connection;
  try {
    // Conectar sin especificar la base de datos (para poder eliminarla)
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true,
      connectTimeout: 15000,
    });

    console.log('✅ Conectado a MySQL\n');

    // 1. Eliminar la base de datos si existe
    console.log('🗑️  Eliminando base de datos existente...');
    await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
    console.log('✅ Base de datos eliminada\n');

    // 2. Crear la base de datos nuevamente
    console.log('📦 Creando base de datos...');
    await connection.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log('✅ Base de datos creada\n');

    // Cerrar conexión
    await connection.end();

    // 3. Ejecutar migraciones TypeORM
    console.log('🔄 Ejecutando migraciones TypeORM...');
    try {
      execSync('npm run migration:run', {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..'),
        env: process.env,
      });
      console.log('✅ Migraciones ejecutadas correctamente\n');
    } catch (error) {
      console.error('❌ Error ejecutando migraciones:', error.message);
      throw error;
    }

    // 4. Reconectar a la base de datos creada
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      multipleStatements: true,
      connectTimeout: 15000,
    });

    // 5. Crear todos los roles principales
    console.log('👥 Creando roles principales...');
    const roles = [
      {
        rolNombre: 'Super Administrador',
        rolTipo: 'superadmin',
        rolDescripcion: 'Administrador con todos los permisos incluyendo cambio de roles',
      },
      {
        rolNombre: 'Administrador',
        rolTipo: 'admin',
        rolDescripcion: 'Administrador de oficina con permisos completos excepto cambio de roles',
      },
      {
        rolNombre: 'Administrador - Centro Operativo',
        rolTipo: 'administrador',
        rolDescripcion: 'Usuario con acceso de solo lectura a la información del centro operativo. No puede editar ni eliminar datos.',
      },
      {
        rolNombre: 'Técnico',
        rolTipo: 'tecnico',
        rolDescripcion: 'Usuario técnico con acceso a aplicación móvil y instalaciones asignadas',
      },
      {
        rolNombre: 'Soldador',
        rolTipo: 'soldador',
        rolDescripcion: 'Rol para personal de campo especializado en soldadura. Acceso principalmente a la aplicación móvil.',
      },
      {
        rolNombre: 'Almacenista',
        rolTipo: 'almacenista',
        rolDescripcion: 'Puede gestionar entradas, salidas, asignaciones, devoluciones y traslados. Puede ver instalaciones y aprobar material, pero no puede editar, eliminar ni cambiar estado de instalaciones.',
      },
      {
        rolNombre: 'Bodega Internas',
        rolTipo: 'bodega-internas',
        rolDescripcion: 'Puede gestionar instalaciones, proyectos, usuarios y tipos de instalaciones. No puede asignar material. La información no se cruza con Bodega Redes.',
      },
      {
        rolNombre: 'Bodega Redes',
        rolTipo: 'bodega-redes',
        rolDescripcion: 'Puede gestionar instalaciones, proyectos, usuarios y tipos de instalaciones. No puede asignar material. La información no se cruza con Bodega Internas.',
      },
    ];

    for (const rol of roles) {
      await connection.execute(
        `INSERT INTO roles (rolNombre, rolTipo, rolDescripcion, rolEstado, fechaCreacion, fechaActualizacion)
         VALUES (?, ?, ?, 1, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           rolNombre = VALUES(rolNombre),
           rolDescripcion = VALUES(rolDescripcion),
           rolEstado = 1,
           fechaActualizacion = NOW()`,
        [rol.rolNombre, rol.rolTipo, rol.rolDescripcion]
      );
    }
    console.log(`✅ ${roles.length} roles creados correctamente\n`);

    // 6. Crear usuario superadmin
    console.log('👤 Creando usuario superadmin...');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@jarlepsis.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123';
    const adminNombre = process.env.ADMIN_NOMBRE || 'Super';
    const adminApellido = process.env.ADMIN_APELLIDO || 'Admin';
    const adminDocumento = process.env.ADMIN_DOCUMENTO || '9999999999';

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Obtener el ID del rol superadmin
    const [superAdminRole] = await connection.execute(
      'SELECT rolId FROM roles WHERE rolTipo = ? LIMIT 1',
      ['superadmin']
    );

    if (superAdminRole.length === 0) {
      throw new Error('No se pudo encontrar el rol superadmin');
    }

    const superAdminRolId = superAdminRole[0].rolId;

    // Crear o actualizar el usuario superadmin
    await connection.execute(
      `INSERT INTO usuarios (
        usuarioRolId,
        usuarioNombre,
        usuarioApellido,
        usuarioCorreo,
        usuarioDocumento,
        usuarioContrasena,
        usuarioEstado,
        fechaCreacion,
        fechaActualizacion
      ) VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
      ON DUPLICATE KEY UPDATE 
        usuarioRolId = VALUES(usuarioRolId),
        usuarioContrasena = VALUES(usuarioContrasena),
        usuarioEstado = 1,
        fechaActualizacion = NOW()`,
      [superAdminRolId, adminNombre, adminApellido, adminEmail, adminDocumento, passwordHash]
    );

    console.log('✅ Usuario superadmin creado/actualizado\n');
    console.log('📝 Credenciales de acceso:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}\n`);

    // Cerrar conexión antes de ejecutar seed
    await connection.end();

    // 7. Ejecutar seed para datos adicionales (Colombia, categorías, etc.)
    console.log('🌱 Ejecutando seed de datos adicionales...');
    try {
      execSync('npm run seed', {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..'),
        env: process.env,
      });
      console.log('✅ Seed ejecutado correctamente\n');
    } catch (error) {
      console.error('⚠️  Advertencia: Error ejecutando seed adicional:', error.message);
      console.log('   Continuando sin datos adicionales...\n');
    }

    console.log('✅ Reseteo de base de datos completado exitosamente! 🎉\n');

  } catch (err) {
    console.error('❌ Error durante el reseteo:', err.message);
    if (err.code === 'ENOTFOUND') {
      console.error('\n💡 Posibles soluciones:');
      console.error('   1. Verifica que el servidor de base de datos esté accesible');
      console.error('   2. Verifica la configuración en tu archivo .env');
      console.error('   3. Si es una BD remota, asegúrate de tener conexión a internet');
      console.error('   4. Si quieres usar una BD local, configura DB_HOST=127.0.0.1 en tu .env\n');
    }
    if (err.sql) {
      console.error('SQL:', err.sql);
    }
    if (err.stack && process.env.NODE_ENV === 'development') {
      console.error('\nStack trace:', err.stack);
    }
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end().catch(() => {});
    }
  }
}

// Ejecutar
resetDatabase();
