const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function createBodegaGroups() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'jarlepsisdev';

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
    });

    console.log('🔍 Buscando bodegas sin grupos de chat...\n');

    // Buscar todas las bodegas
    const [bodegas] = await connection.execute(
      'SELECT bodegaId, bodegaNombre FROM bodegas WHERE bodegaEstado = 1'
    );

    if (bodegas.length === 0) {
      console.log('⚠️  No se encontraron bodegas activas.\n');
      return;
    }

    console.log(`📦 Se encontraron ${bodegas.length} bodega(s):\n`);

    let gruposCreados = 0;
    let gruposExistentes = 0;

    for (const bodega of bodegas) {
      // Verificar si ya existe un grupo para esta bodega
      const [gruposExistentes] = await connection.execute(
        'SELECT grupoId FROM grupos WHERE tipoGrupo = ? AND entidadId = ?',
        ['bodega', bodega.bodegaId]
      );

      if (gruposExistentes.length > 0) {
        console.log(`   ⏭️  Bodega "${bodega.bodegaNombre}" ya tiene grupo de chat`);
        gruposExistentes++;
        continue;
      }

      // Crear el grupo
      const [result] = await connection.execute(
        `INSERT INTO grupos (
          grupoNombre,
          grupoDescripcion,
          tipoGrupo,
          entidadId,
          grupoActivo,
          fechaCreacion,
          fechaActualizacion
        ) VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
        [
          `Bodega ${bodega.bodegaNombre}`,
          `Grupo de chat de la bodega ${bodega.bodegaNombre}`,
          'bodega',
          bodega.bodegaId
        ]
      );

      const grupoId = result.insertId;

      // Crear mensaje automático de bienvenida
      // Primero obtener el usuario sistema (buscar por correo sistema@jarlepsis.com o el primer superadmin)
      let sistemaUsuarioId = null;
      
      const [sistemaUsuario] = await connection.execute(
        'SELECT usuarioId FROM usuarios WHERE usuarioCorreo = ? LIMIT 1',
        ['sistema@jarlepsis.com']
      );

      if (sistemaUsuario.length > 0) {
        sistemaUsuarioId = sistemaUsuario[0].usuarioId;
      } else {
        // Buscar el primer superadmin
        const [superadmin] = await connection.execute(
          `SELECT u.usuarioId 
           FROM usuarios u 
           INNER JOIN roles r ON u.usuarioRolId = r.rolId 
           WHERE r.rolTipo = 'superadmin' 
           LIMIT 1`
        );
        if (superadmin.length > 0) {
          sistemaUsuarioId = superadmin[0].usuarioId;
        } else {
          // Usar el primer usuario disponible
          const [primerUsuario] = await connection.execute(
            'SELECT usuarioId FROM usuarios LIMIT 1'
          );
          if (primerUsuario.length > 0) {
            sistemaUsuarioId = primerUsuario[0].usuarioId;
          }
        }
      }

      if (sistemaUsuarioId) {
        await connection.execute(
          `INSERT INTO mensajes (
            grupoId,
            usuarioId,
            mensajeTexto,
            mensajeEditado,
            mensajeActivo,
            fechaCreacion,
            fechaActualizacion
          ) VALUES (?, ?, ?, 0, 1, NOW(), NOW())`,
          [
            grupoId,
            sistemaUsuarioId,
            `🏭 Grupo creado para la bodega "${bodega.bodegaNombre}". Este es el espacio de comunicación para coordinar actividades relacionadas con esta bodega.`
          ]
        );
      }

      console.log(`   ✅ Grupo creado para bodega "${bodega.bodegaNombre}" (ID: ${grupoId})`);
      gruposCreados++;
    }

    console.log(`\n📊 Resumen:`);
    console.log(`   ✅ Grupos creados: ${gruposCreados}`);
    console.log(`   ⏭️  Grupos existentes: ${gruposExistentes}`);
    console.log(`   📦 Total bodegas: ${bodegas.length}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createBodegaGroups()
  .then(() => {
    console.log('✨ Proceso completado exitosamente\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

