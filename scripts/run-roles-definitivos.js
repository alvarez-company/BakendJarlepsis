#!/usr/bin/env node
/**
 * Deja los roles de la base de datos alineados con la definición actual:
 * - Un solo Administrador (admin): migra usuarios de "administrador" a "admin" y elimina el rol "Administrador - Centro Operativo".
 * - Añade rol Gerencia (gerencia) y valor en enum si no existe.
 * - Actualiza descripciones de Super Administrador y Administrador.
 *
 * Uso: node scripts/run-roles-definitivos.js
 * O:   npm run migration:roles-definitivos
 *
 * Requiere: .env con DB_*
 */

/* eslint-disable no-console */
const path = require('path');
const mysql = require('mysql2/promise');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const DESCRIPCION_SUPERADMIN =
  'Rol exclusivo de desarrollo. Todos los permisos incluyendo cambio de roles e impersonación. No se lista en la interfaz.';
const DESCRIPCION_GERENCIA =
  'Máximo nivel para la organización. Mismos permisos que SuperAdmin pero sin impersonación.';
const DESCRIPCION_ADMIN =
  'Administrador del centro operativo con permisos completos. Gestiona sedes, bodegas, instalaciones y usuarios de su centro. No puede cambiar roles de otros usuarios.';

async function run() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const dbUser = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'jarlepsisdev';

  console.log('🔄 Ajustando roles a la definición definitiva\n');
  console.log(`   DB: ${host}:${port}/${database}\n`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user: dbUser,
      password,
      database,
      multipleStatements: true,
    });

    // ─── 1. Unificar administrador: pasar usuarios de "administrador" a "admin" ───
    const [adminRows] = await connection.query(
      `SELECT rolId FROM roles WHERE rolTipo = 'admin' LIMIT 1`
    );
    if (adminRows && adminRows.length > 0) {
      const adminRolId = adminRows[0].rolId;
      const [upd] = await connection.query(
        `UPDATE usuarios u
         INNER JOIN roles r ON u.usuarioRolId = r.rolId
         SET u.usuarioRolId = ?
         WHERE r.rolTipo = 'administrador'`,
        [adminRolId]
      );
      if (upd.affectedRows > 0) {
        console.log(`   ✅ ${upd.affectedRows} usuario(s) pasados de "Administrador - Centro Operativo" a "Administrador"`);
      }
    }

    // ─── 2. Eliminar el rol "Administrador - Centro Operativo" (administrador) ───
    const [del] = await connection.query(
      `DELETE FROM roles WHERE rolTipo = 'administrador'`
    );
    if (del.affectedRows > 0) {
      console.log('   ✅ Rol "Administrador - Centro Operativo" eliminado');
    } else {
      console.log('   ⏭️  Rol "administrador" no existía');
    }

    // ─── 3. Enum: quitar 'administrador', añadir 'gerencia' si falta ───
    const [colRows] = await connection.query(
      `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'rolTipo'`,
      [database]
    );
    if (colRows.length === 0) {
      throw new Error('No se encontró la columna rolTipo en la tabla roles.');
    }
    const columnType = colRows[0].COLUMN_TYPE;
    const match = columnType.match(/enum\s*\((.+)\)/i);
    let currentEnum = match
      ? match[1].split(',').map((v) => v.trim().replace(/^'|'$/g, ''))
      : [];
    // Quitar 'administrador' y asegurar 'gerencia'
    currentEnum = currentEnum.filter((v) => v !== 'administrador');
    if (!currentEnum.includes('gerencia')) {
      currentEnum.push('gerencia');
    }
    const enumStr = currentEnum.map((v) => `'${v}'`).join(',');
    await connection.query(
      `ALTER TABLE \`roles\` MODIFY COLUMN \`rolTipo\` ENUM(${enumStr}) NOT NULL`
    );
    console.log('   ✅ Enum rolTipo actualizado (sin administrador, con gerencia)');

    // ─── 4. Insertar rol Gerencia si no existe ───
    const [ins] = await connection.query(`
      INSERT INTO \`roles\` (\`rolNombre\`, \`rolTipo\`, \`rolDescripcion\`, \`rolEstado\`, \`fechaCreacion\`, \`fechaActualizacion\`)
      SELECT 'Gerencia', 'gerencia', ?, 1, NOW(), NOW()
      FROM DUAL
      WHERE NOT EXISTS (SELECT 1 FROM \`roles\` WHERE \`rolTipo\` = 'gerencia' LIMIT 1)
    `, [DESCRIPCION_GERENCIA]);
    if (ins.affectedRows > 0) {
      console.log('   ✅ Rol Gerencia insertado');
    } else {
      console.log('   ⏭️  Rol Gerencia ya existía');
    }

    // ─── 5. Actualizar descripciones de Super Administrador y Administrador ───
    await connection.query(
      `UPDATE roles SET rolDescripcion = ?, fechaActualizacion = NOW() WHERE rolTipo = 'superadmin'`,
      [DESCRIPCION_SUPERADMIN]
    );
    await connection.query(
      `UPDATE roles SET rolDescripcion = ?, fechaActualizacion = NOW() WHERE rolTipo = 'admin'`,
      [DESCRIPCION_ADMIN]
    );
    console.log('   ✅ Descripciones de Super Administrador y Administrador actualizadas');

    console.log('\n✅ Roles definitivos aplicados.\n');
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.sql) console.error('SQL:', err.sql);
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end().catch(() => {});
  }
}

run();
