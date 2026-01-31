#!/usr/bin/env node
/**
 * Crea o actualiza únicamente el usuario superadmin.
 * Requiere: migraciones ejecutadas y roles existentes (o ejecutar antes: npm run seed).
 *
 * Uso: node scripts/seed-superadmin.js
 *      npm run seed:superadmin
 *
 * Variables de entorno (.env): ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NOMBRE, ADMIN_APELLIDO, ADMIN_DOCUMENTO
 */

/* eslint-disable no-console */
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

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

  console.log('👤 Seed superadmin - Crear/actualizar usuario administrador\n');
  console.log(`   DB: ${host}:${port}/${database}`);
  console.log(`   Email: ${adminEmail}\n`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      connectTimeout: 15000,
    });

    const [superAdminRole] = await connection.execute(
      'SELECT rolId FROM roles WHERE rolTipo = ? LIMIT 1',
      ['superadmin']
    );
    if (superAdminRole.length === 0) {
      throw new Error('No se encontró el rol superadmin. Ejecute antes: npm run seed');
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

    console.log('✅ Usuario superadmin creado/actualizado.\n');
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
