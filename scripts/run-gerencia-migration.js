#!/usr/bin/env node
/**
 * Ejecuta solo la migración AddGerenciaRole: añade 'gerencia' al enum rolTipo
 * e inserta el rol Gerencia. No toca otras migraciones ni el seed completo.
 *
 * Uso: node scripts/run-gerencia-migration.js
 * O:   npm run migration:gerencia
 *
 * Requiere: .env con DB_*
 */

/* eslint-disable no-console */
const path = require('path');
const mysql = require('mysql2/promise');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'jarlepsisdev';

  console.log('🔄 Migración solo Gerencia (y enum rolTipo)\n');
  console.log(`   DB: ${host}:${port}/${database}\n`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      multipleStatements: true,
    });

    // 1. Obtener enum actual de roles.rolTipo
    const [rows] = await connection.query(
      `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'rolTipo'`,
      [database]
    );

    if (rows.length === 0) {
      throw new Error('No se encontró la columna rolTipo en la tabla roles.');
    }

    const columnType = rows[0].COLUMN_TYPE;
    if (columnType.toUpperCase().indexOf('ENUM') === -1) {
      throw new Error('La columna rolTipo no es de tipo ENUM.');
    }

    // Extraer valores del enum: enum('a','b','c') -> ['a','b','c']
    const match = columnType.match(/enum\s*\((.+)\)/i);
    const currentEnum = match
      ? match[1].split(',').map((v) => v.trim().replace(/^'|'$/g, ''))
      : [];

    if (!currentEnum.includes('gerencia')) {
      const newEnum = [...currentEnum, 'gerencia'];
      const enumStr = newEnum.map((v) => `'${v}'`).join(',');
      await connection.query(
        `ALTER TABLE \`roles\` MODIFY COLUMN \`rolTipo\` ENUM(${enumStr}) NOT NULL`
      );
      console.log('   ✅ Valor \'gerencia\' añadido al enum rolTipo');
    } else {
      console.log('   ⏭️  Enum rolTipo ya incluye \'gerencia\'');
    }

    // 2. Insertar rol Gerencia si no existe
    const [insertResult] = await connection.query(`
      INSERT INTO \`roles\` (\`rolNombre\`, \`rolTipo\`, \`rolDescripcion\`, \`rolEstado\`, \`fechaCreacion\`, \`fechaActualizacion\`)
      SELECT 'Gerencia', 'gerencia', 'Máximo nivel para la organización. Mismos permisos que SuperAdmin pero sin impersonación.', 1, NOW(), NOW()
      FROM DUAL
      WHERE NOT EXISTS (SELECT 1 FROM \`roles\` WHERE \`rolTipo\` = 'gerencia' LIMIT 1)
    `);

    if (insertResult.affectedRows > 0) {
      console.log('   ✅ Rol Gerencia insertado');
    } else {
      console.log('   ⏭️  Rol Gerencia ya existía');
    }

    console.log('\n✅ Migración Gerencia completada.\n');
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.sql) console.error('SQL:', err.sql);
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end().catch(() => {});
  }
}

run();
