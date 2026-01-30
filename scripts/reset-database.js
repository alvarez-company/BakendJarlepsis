/* eslint-disable no-console */
const { execSync } = require('child_process');
const readline = require('readline');
const path = require('path');
const mysql = require('mysql2/promise');
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

    // 4. Ejecutar seed único (roles, tipos doc, Colombia, categorías, superadmin)
    console.log('🌱 Ejecutando seed único...');
    try {
      execSync('npm run seed', {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..'),
        env: process.env,
      });
      console.log('✅ Seed ejecutado correctamente\n');
    } catch (error) {
      console.error('❌ Error ejecutando seed:', error.message);
      throw error;
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
