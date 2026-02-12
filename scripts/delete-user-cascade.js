#!/usr/bin/env node
/**
 * Script para eliminar un usuario y todos sus datos relacionados en cascada.
 * 
 * Uso: node scripts/delete-user-cascade.js <usuarioId>
 * O:   node scripts/delete-user-cascade.js <usuarioId> --keep-historical
 * 
 * --keep-historical: Mantiene registros históricos poniendo usuarioRegistra/usuarioCreador en NULL
 *                    en lugar de eliminar esos registros (por defecto: false, elimina todo)
 * 
 * Requiere: .env con DB_*
 */

/* eslint-disable no-console */
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jarlepsisdev',
  multipleStatements: true,
};

async function deleteUserCascade(usuarioId, keepHistorical = false) {
  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    await connection.beginTransaction();

    // 1. Verificar que el usuario existe
    const [users] = await connection.query(
      'SELECT usuarioId, usuarioNombre, usuarioApellido, usuarioCorreo, usuarioDocumento FROM usuarios WHERE usuarioId = ?',
      [usuarioId]
    );

    if (users.length === 0) {
      throw new Error(`Usuario con ID ${usuarioId} no encontrado`);
    }

    const usuario = users[0];
    console.log(`\n🗑️  Eliminando usuario: ${usuario.usuarioNombre} ${usuario.usuarioApellido} (${usuario.usuarioCorreo})`);
    console.log(`   Documento: ${usuario.usuarioDocumento}\n`);

    // 2. Eliminar reacciones de mensajes
    const [reacciones] = await connection.query(
      'SELECT COUNT(*) as count FROM reacciones_mensaje WHERE usuarioId = ?',
      [usuarioId]
    );
    if (reacciones[0].count > 0) {
      await connection.query('DELETE FROM reacciones_mensaje WHERE usuarioId = ?', [usuarioId]);
      console.log(`   ✓ Eliminadas ${reacciones[0].count} reacciones de mensajes`);
    }

    // 3. Eliminar mensajes enviados
    const [mensajes] = await connection.query(
      'SELECT COUNT(*) as count FROM mensajes WHERE usuarioId = ?',
      [usuarioId]
    );
    if (mensajes[0].count > 0) {
      await connection.query('DELETE FROM mensajes WHERE usuarioId = ?', [usuarioId]);
      console.log(`   ✓ Eliminados ${mensajes[0].count} mensajes`);
    }

    // 4. Eliminar notificaciones
    const [notificaciones] = await connection.query(
      'SELECT COUNT(*) as count FROM notificaciones WHERE usuarioId = ?',
      [usuarioId]
    );
    if (notificaciones[0].count > 0) {
      await connection.query('DELETE FROM notificaciones WHERE usuarioId = ?', [usuarioId]);
      console.log(`   ✓ Eliminadas ${notificaciones[0].count} notificaciones`);
    }

    // 5. Eliminar estado de usuario (OneToOne)
    const [estados] = await connection.query(
      'SELECT COUNT(*) as count FROM estados_usuario WHERE usuarioId = ?',
      [usuarioId]
    );
    if (estados[0].count > 0) {
      await connection.query('DELETE FROM estados_usuario WHERE usuarioId = ?', [usuarioId]);
      console.log(`   ✓ Eliminado estado de usuario`);
    }

    // 6. Eliminar usuarios_grupos
    const [grupos] = await connection.query(
      'SELECT COUNT(*) as count FROM usuarios_grupos WHERE usuarioId = ?',
      [usuarioId]
    );
    if (grupos[0].count > 0) {
      await connection.query('DELETE FROM usuarios_grupos WHERE usuarioId = ?', [usuarioId]);
      console.log(`   ✓ Eliminadas ${grupos[0].count} asignaciones a grupos`);
    }

    // 7. Eliminar instalaciones_usuarios
    const [instalacionesUsuarios] = await connection.query(
      'SELECT COUNT(*) as count FROM instalaciones_usuarios WHERE usuarioId = ?',
      [usuarioId]
    );
    if (instalacionesUsuarios[0].count > 0) {
      await connection.query('DELETE FROM instalaciones_usuarios WHERE usuarioId = ?', [usuarioId]);
      console.log(`   ✓ Eliminadas ${instalacionesUsuarios[0].count} asignaciones a instalaciones`);
    }

    // 8. Eliminar inventario_tecnicos
    const [inventarioTecnico] = await connection.query(
      'SELECT COUNT(*) as count FROM inventario_tecnicos WHERE usuarioId = ?',
      [usuarioId]
    );
    if (inventarioTecnico[0].count > 0) {
      await connection.query('DELETE FROM inventario_tecnicos WHERE usuarioId = ?', [usuarioId]);
      console.log(`   ✓ Eliminados ${inventarioTecnico[0].count} registros de inventario técnico`);
    }

    // 9. Eliminar asignaciones_tecnicos (como usuario asignado y como asignador)
    const [asignacionesRecibidas] = await connection.query(
      'SELECT COUNT(*) as count FROM asignaciones_tecnicos WHERE usuarioId = ?',
      [usuarioId]
    );
    const [asignacionesRealizadas] = await connection.query(
      'SELECT COUNT(*) as count FROM asignaciones_tecnicos WHERE usuarioAsignadorId = ?',
      [usuarioId]
    );
    if (asignacionesRecibidas[0].count > 0) {
      await connection.query('DELETE FROM asignaciones_tecnicos WHERE usuarioId = ?', [usuarioId]);
      console.log(`   ✓ Eliminadas ${asignacionesRecibidas[0].count} asignaciones recibidas`);
    }
    if (asignacionesRealizadas[0].count > 0) {
      await connection.query('DELETE FROM asignaciones_tecnicos WHERE usuarioAsignadorId = ?', [usuarioId]);
      console.log(`   ✓ Eliminadas ${asignacionesRealizadas[0].count} asignaciones realizadas`);
    }

    // 10. Actualizar números_medidor (SET NULL según la FK)
    const [numerosMedidor] = await connection.query(
      'SELECT COUNT(*) as count FROM numeros_medidor WHERE usuarioId = ?',
      [usuarioId]
    );
    if (numerosMedidor[0].count > 0) {
      await connection.query('UPDATE numeros_medidor SET usuarioId = NULL WHERE usuarioId = ?', [usuarioId]);
      console.log(`   ✓ Actualizados ${numerosMedidor[0].count} números de medidor (usuarioId = NULL)`);
    }

    // 11. Actualizar movimientos_inventario (usuarioId y tecnicoOrigenId)
    const [movimientosUsuario] = await connection.query(
      'SELECT COUNT(*) as count FROM movimientos_inventario WHERE usuarioId = ?',
      [usuarioId]
    );
    const [movimientosTecnico] = await connection.query(
      'SELECT COUNT(*) as count FROM movimientos_inventario WHERE tecnicoOrigenId = ?',
      [usuarioId]
    );
    if (movimientosUsuario[0].count > 0) {
      if (keepHistorical) {
        await connection.query('UPDATE movimientos_inventario SET usuarioId = NULL WHERE usuarioId = ?', [usuarioId]);
        console.log(`   ✓ Actualizados ${movimientosUsuario[0].count} movimientos (usuarioId = NULL)`);
      } else {
        await connection.query('DELETE FROM movimientos_inventario WHERE usuarioId = ?', [usuarioId]);
        console.log(`   ✓ Eliminados ${movimientosUsuario[0].count} movimientos`);
      }
    }
    if (movimientosTecnico[0].count > 0) {
      await connection.query('UPDATE movimientos_inventario SET tecnicoOrigenId = NULL WHERE tecnicoOrigenId = ?', [usuarioId]);
      console.log(`   ✓ Actualizados ${movimientosTecnico[0].count} movimientos (tecnicoOrigenId = NULL)`);
    }

    // 12. Eliminar traslados
    const [traslados] = await connection.query(
      'SELECT COUNT(*) as count FROM traslados WHERE usuarioId = ?',
      [usuarioId]
    );
    if (traslados[0].count > 0) {
      if (keepHistorical) {
        await connection.query('UPDATE traslados SET usuarioId = NULL WHERE usuarioId = ?', [usuarioId]);
        console.log(`   ✓ Actualizados ${traslados[0].count} traslados (usuarioId = NULL)`);
      } else {
        await connection.query('DELETE FROM traslados WHERE usuarioId = ?', [usuarioId]);
        console.log(`   ✓ Eliminados ${traslados[0].count} traslados`);
      }
    }

    // 13. Eliminar auditoria_eliminaciones
    const [auditoria] = await connection.query(
      'SELECT COUNT(*) as count FROM auditoria_eliminaciones WHERE usuarioId = ?',
      [usuarioId]
    );
    if (auditoria[0].count > 0) {
      await connection.query('DELETE FROM auditoria_eliminaciones WHERE usuarioId = ?', [usuarioId]);
      console.log(`   ✓ Eliminados ${auditoria[0].count} registros de auditoría`);
    }

    // 14. Manejar referencias en otras tablas (usuarioRegistra, usuarioCreador)
    if (keepHistorical) {
      // Poner NULL en lugar de eliminar
      const tablesWithUsuarioRegistra = [
        'instalaciones',
        'materiales',
        'clientes',
        'proyectos',
        'tipos_instalacion',
        'clasificaciones',
        'unidades_medida',
      ];

      for (const table of tablesWithUsuarioRegistra) {
        const [result] = await connection.query(
          `SELECT COUNT(*) as count FROM ${table} WHERE usuarioRegistra = ?`,
          [usuarioId]
        );
        if (result[0].count > 0) {
          await connection.query(
            `UPDATE ${table} SET usuarioRegistra = NULL WHERE usuarioRegistra = ?`,
            [usuarioId]
          );
          console.log(`   ✓ Actualizados ${result[0].count} registros en ${table} (usuarioRegistra = NULL)`);
        }
      }

      // Actualizar usuarioCreador en usuarios
      const [usuariosCreados] = await connection.query(
        'SELECT COUNT(*) as count FROM usuarios WHERE usuarioCreador = ?',
        [usuarioId]
      );
      if (usuariosCreados[0].count > 0) {
        await connection.query('UPDATE usuarios SET usuarioCreador = NULL WHERE usuarioCreador = ?', [usuarioId]);
        console.log(`   ✓ Actualizados ${usuariosCreados[0].count} usuarios creados (usuarioCreador = NULL)`);
      }
    } else {
      // Eliminar registros históricos (CUIDADO: esto puede eliminar datos importantes)
      console.log(`\n   ⚠️  Modo: Eliminación completa (no se mantienen registros históricos)`);
      
      // Para instalaciones, solo actualizar usuarioRegistra (no eliminar instalaciones)
      await connection.query(
        'UPDATE instalaciones SET usuarioRegistra = NULL WHERE usuarioRegistra = ?',
        [usuarioId]
      );
      
      // Para otras tablas, también solo actualizar
      await connection.query(
        'UPDATE materiales SET usuarioRegistra = NULL WHERE usuarioRegistra = ?',
        [usuarioId]
      );
      await connection.query(
        'UPDATE clientes SET usuarioRegistra = NULL WHERE usuarioRegistra = ?',
        [usuarioId]
      );
      await connection.query(
        'UPDATE proyectos SET usuarioRegistra = NULL WHERE usuarioRegistra = ?',
        [usuarioId]
      );
      await connection.query(
        'UPDATE tipos_instalacion SET usuarioRegistra = NULL WHERE usuarioRegistra = ?',
        [usuarioId]
      );
      await connection.query(
        'UPDATE clasificaciones SET usuarioRegistra = NULL WHERE usuarioRegistra = ?',
        [usuarioId]
      );
      await connection.query(
        'UPDATE unidades_medida SET usuarioRegistra = NULL WHERE usuarioRegistra = ?',
        [usuarioId]
      );
      
      // Actualizar usuarioCreador
      await connection.query(
        'UPDATE usuarios SET usuarioCreador = NULL WHERE usuarioCreador = ?',
        [usuarioId]
      );
      
      console.log(`   ✓ Referencias históricas actualizadas a NULL`);
    }

    // 15. Finalmente, eliminar el usuario
    await connection.query('DELETE FROM usuarios WHERE usuarioId = ?', [usuarioId]);
    console.log(`\n   ✅ Usuario eliminado exitosamente\n`);

    await connection.commit();
    console.log('✅ Transacción completada exitosamente');
  } catch (error) {
    await connection.rollback();
    console.error('\n❌ Error durante la eliminación:', error.message);
    console.error('   La transacción ha sido revertida. No se realizaron cambios.\n');
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// Ejecutar script
const args = process.argv.slice(2);
const usuarioId = parseInt(args[0], 10);
const keepHistorical = args.includes('--keep-historical');

if (!usuarioId || isNaN(usuarioId)) {
  console.error('❌ Error: Debes proporcionar un ID de usuario válido');
  console.error('\nUso: node scripts/delete-user-cascade.js <usuarioId> [--keep-historical]');
  console.error('\nEjemplos:');
  console.error('  node scripts/delete-user-cascade.js 5');
  console.error('  node scripts/delete-user-cascade.js 5 --keep-historical');
  process.exit(1);
}

deleteUserCascade(usuarioId, keepHistorical).catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
