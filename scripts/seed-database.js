/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'jarlepsisdev';

  // Configuración del admin
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@jarlepsis.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123';
  const adminNombre = process.env.ADMIN_NOMBRE || 'Super';
  const adminApellido = process.env.ADMIN_APELLIDO || 'Admin';
  const adminDocumento = process.env.ADMIN_DOCUMENTO || '9999999999';

  console.log('🌱 Iniciando seed de base de datos...\n');
  console.log('📋 Configuración:');
  console.log(`   DB: ${host}:${port}/${database}`);
  console.log(`   Admin Email: ${adminEmail}`);
  console.log(`   Admin Password: ${adminPassword}\n`);

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

    // 1. Ejecutar seed de Colombia (países, departamentos, municipios)
    const colombiaSeedPath = path.resolve(__dirname, '../src/migrations/seed_colombia.sql');
    if (fs.existsSync(colombiaSeedPath)) {
      console.log('📦 Poblando datos de Colombia (países, departamentos, municipios)...');
      let colombiaSql = fs.readFileSync(colombiaSeedPath, 'utf8');
      // Reemplazar INSERT INTO con INSERT IGNORE INTO, pero preservar los que tienen ON DUPLICATE KEY UPDATE
      // Dividir por statements y procesar cada uno
      const statements = colombiaSql.split(';').filter(s => s.trim());
      colombiaSql = statements.map(stmt => {
        if (stmt.includes('ON DUPLICATE KEY UPDATE')) {
          return stmt; // No modificar statements con ON DUPLICATE KEY UPDATE
        }
        return stmt.replace(/INSERT INTO /gi, 'INSERT IGNORE INTO ');
      }).join(';') + (colombiaSql.endsWith(';') ? ';' : '');
      await connection.query(colombiaSql);
      console.log('✅ Datos de Colombia cargados correctamente\n');
    } else {
      console.log('⚠️  Archivo seed_colombia.sql no encontrado, se omite\n');
    }

    // 2. Ejecutar seed de datos iniciales (roles, tipos, categorías)
    const initialSeedPath = path.resolve(__dirname, '../src/migrations/seed_initial_data.sql');
    if (fs.existsSync(initialSeedPath)) {
      console.log('📦 Cargando datos iniciales (roles, tipos, categorías)...');
      let initialSql = fs.readFileSync(initialSeedPath, 'utf8');
      
      // Remover el bloque completo del INSERT del usuario admin
      // Busca desde "-- 2. CREAR SUPERADMIN" hasta el final del INSERT
      const lines = initialSql.split('\n');
      let inAdminBlock = false;
      let adminBlockStart = -1;
      let adminBlockEnd = -1;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('-- 2. CREAR SUPERADMIN')) {
          inAdminBlock = true;
          adminBlockStart = i;
        }
        if (inAdminBlock && lines[i].trim() === ');' && lines[i-1] && lines[i-1].includes('NOW()')) {
          adminBlockEnd = i;
          break;
        }
      }
      
      if (adminBlockStart !== -1 && adminBlockEnd !== -1) {
        // Buscar el inicio del bloque (comentario anterior)
        let actualStart = adminBlockStart;
        while (actualStart > 0 && !lines[actualStart - 1].includes('-- ==========================================')) {
          actualStart--;
        }
        if (actualStart > 0) actualStart--; // Incluir la línea del separador
        
        // Eliminar el bloque
        lines.splice(actualStart, adminBlockEnd - actualStart + 1);
        initialSql = lines.join('\n');
      }
      
      // Reemplazar INSERT INTO con INSERT IGNORE INTO para evitar errores de duplicados
      // Dividir por statements y procesar cada uno
      const statements = initialSql.split(';').filter(s => s.trim());
      initialSql = statements.map(stmt => {
        if (stmt.includes('ON DUPLICATE KEY UPDATE')) {
          return stmt; // No modificar statements con ON DUPLICATE KEY UPDATE
        }
        return stmt.replace(/INSERT INTO /gi, 'INSERT IGNORE INTO ');
      }).join(';') + (initialSql.endsWith(';') ? ';' : '');
      
      await connection.query(initialSql);
      console.log('✅ Datos iniciales cargados correctamente\n');
    } else {
      console.log('⚠️  Archivo seed_initial_data.sql no encontrado, se omite\n');
    }

    // 3. Crear usuario admin con hash de contraseña correcto
    console.log('👤 Creando usuario admin...');
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    
    // Verificar si el rol SuperAdmin existe
    const [roles] = await connection.execute(
      'SELECT rolId FROM roles WHERE rolTipo = ? LIMIT 1',
      ['superadmin']
    );
    
    if (roles.length === 0) {
      throw new Error('El rol SuperAdmin no existe. Ejecuta primero el seed de datos iniciales.');
    }
    
    const rolId = roles[0].rolId;
    
    // Crear o actualizar el usuario admin
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
        usuarioContrasena = VALUES(usuarioContrasena),
        usuarioEstado = 1,
        fechaActualizacion = NOW()`,
      [rolId, adminNombre, adminApellido, adminEmail, adminDocumento, passwordHash]
    );
    
    console.log('✅ Usuario admin creado/actualizado\n');

    // 4. Verificar que el admin fue creado correctamente
    console.log('🔍 Verificando usuario admin...');
    const [users] = await connection.execute(
      'SELECT usuarioId, usuarioCorreo, usuarioNombre, usuarioApellido FROM usuarios WHERE usuarioCorreo = ?',
      [adminEmail]
    );

    if (users.length > 0) {
      const adminUser = users[0];
      console.log('✅ Usuario admin creado/actualizado:');
      console.log(`   ID: ${adminUser.usuarioId}`);
      console.log(`   Nombre: ${adminUser.usuarioNombre} ${adminUser.usuarioApellido}`);
      console.log(`   Email: ${adminUser.usuarioCorreo}`);
      
      // Verificar que la contraseña funciona
      const [passwordCheck] = await connection.execute(
        'SELECT usuarioContrasena FROM usuarios WHERE usuarioCorreo = ?',
        [adminEmail]
      );
      const isValid = await bcrypt.compare(adminPassword, passwordCheck[0].usuarioContrasena);
      console.log(`   Contraseña válida: ${isValid ? '✅' : '❌'}\n`);
    } else {
      console.log('⚠️  Usuario admin no encontrado después del seed\n');
    }

    // 5. Mostrar resumen de datos cargados
    console.log('📊 Resumen de datos cargados:');
    const [paises] = await connection.execute('SELECT COUNT(*) as count FROM paises');
    const [departamentos] = await connection.execute('SELECT COUNT(*) as count FROM departamentos');
    const [municipios] = await connection.execute('SELECT COUNT(*) as count FROM municipios');
    const [rolesCount] = await connection.execute('SELECT COUNT(*) as count FROM roles');
    
    console.log(`   Países: ${paises[0].count}`);
    console.log(`   Departamentos: ${departamentos[0].count}`);
    console.log(`   Municipios: ${municipios[0].count}`);
    console.log(`   Roles: ${rolesCount[0].count}\n`);

    console.log('✅ Seed completado exitosamente! 🎉\n');
    console.log('📝 Credenciales de acceso:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}\n`);

  } catch (err) {
    console.error('❌ Error ejecutando seed:', err.message);
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

