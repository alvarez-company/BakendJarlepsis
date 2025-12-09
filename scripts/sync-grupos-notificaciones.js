/* eslint-disable no-console */
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const TipoGrupo = {
  GENERAL: 'general',
  SEDE: 'sede',
  OFICINA: 'oficina',
  BODEGA: 'bodega',
  INSTALACION: 'instalacion',
};

const TipoNotificacion = {
  INSTALACION_ASIGNADA: 'instalacion_asignada',
};

async function run() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3307', 10);
  const user = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || 'root';
  const database = process.env.DB_NAME || 'jarlepsisdev';

  console.log('🔄 Iniciando sincronización de grupos y notificaciones...\n');
  console.log(`📋 Configuración: ${host}:${port}/${database}\n`);

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

    console.log('✅ Conectado a la base de datos\n');

    let gruposCreados = 0;
    let usuariosAsignados = 0;
    let notificacionesCreadas = 0;

    // 1. Obtener usuario sistema
    const [usuariosSistema] = await connection.execute(
      `SELECT u.usuarioId, r.rolTipo 
       FROM usuarios u 
       LEFT JOIN roles r ON u.usuarioRolId = r.rolId 
       WHERE u.usuarioCorreo = 'sistema@jarlepsis.com' OR r.rolTipo = 'superadmin' 
       ORDER BY CASE WHEN u.usuarioCorreo = 'sistema@jarlepsis.com' THEN 0 ELSE 1 END 
       LIMIT 1`
    );
    const sistemaUsuarioId = usuariosSistema[0]?.usuarioId || 1;
    console.log(`👤 Usuario sistema: ${sistemaUsuarioId}\n`);

    // 2. Obtener todos los usuarios
    const [usuarios] = await connection.execute(
      `SELECT u.usuarioId, u.usuarioSede, u.usuarioOficina, u.usuarioBodega, r.rolTipo 
       FROM usuarios u 
       LEFT JOIN roles r ON u.usuarioRolId = r.rolId 
       WHERE u.usuarioEstado = 1`
    );
    console.log(`👥 Usuarios encontrados: ${usuarios.length}`);

    // Obtener superadmins
    const superadmins = usuarios.filter(u => u.rolTipo === 'superadmin').map(u => u.usuarioId);
    console.log(`👑 Superadmins: ${superadmins.length}\n`);

    // 3. Crear/verificar grupo general
    console.log('📋 1. Verificando grupo general...');
    let [gruposGeneral] = await connection.execute(
      `SELECT grupoId FROM grupos WHERE tipoGrupo = ?`,
      [TipoGrupo.GENERAL]
    );

    let grupoGeneralId;
    if (gruposGeneral.length === 0) {
      const [result] = await connection.execute(
        `INSERT INTO grupos (grupoNombre, grupoDescripcion, tipoGrupo, grupoActivo, fechaCreacion, fechaActualizacion) 
         VALUES (?, ?, ?, 1, NOW(), NOW())`,
        ['Chat General', 'Chat general del sistema', TipoGrupo.GENERAL]
      );
      grupoGeneralId = result.insertId;
      gruposCreados++;
      console.log(`  ✅ Grupo general creado (ID: ${grupoGeneralId})`);
    } else {
      grupoGeneralId = gruposGeneral[0].grupoId;
      console.log(`  ℹ️  Grupo general ya existe (ID: ${grupoGeneralId})`);
    }

    // Asignar todos los usuarios al grupo general
    for (const usuario of usuarios) {
      const [existe] = await connection.execute(
        `SELECT usuarioGrupoId FROM usuarios_grupos WHERE grupoId = ? AND usuarioId = ?`,
        [grupoGeneralId, usuario.usuarioId]
      );
      if (existe.length === 0) {
        await connection.execute(
          `INSERT INTO usuarios_grupos (grupoId, usuarioId, activo, fechaIngreso) 
           VALUES (?, ?, 1, NOW())`,
          [grupoGeneralId, usuario.usuarioId]
        );
        usuariosAsignados++;
      }
    }
    console.log(`  ✅ ${usuarios.length} usuarios en grupo general\n`);

    // 4. Sincronizar grupos de sedes
    console.log('📋 2. Sincronizando grupos de sedes...');
    const [sedes] = await connection.execute(`SELECT sedeId, sedeNombre FROM sedes WHERE sedeEstado = 1`);
    console.log(`  📊 Sedes encontradas: ${sedes.length}`);

    for (const sede of sedes) {
      let [grupos] = await connection.execute(
        `SELECT grupoId FROM grupos WHERE tipoGrupo = ? AND entidadId = ?`,
        [TipoGrupo.SEDE, sede.sedeId]
      );

      let grupoId;
      if (grupos.length === 0) {
        const [result] = await connection.execute(
          `INSERT INTO grupos (grupoNombre, grupoDescripcion, tipoGrupo, entidadId, grupoActivo, fechaCreacion, fechaActualizacion) 
           VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
          [`Sede ${sede.sedeNombre}`, `Grupo de chat de la sede ${sede.sedeNombre}`, TipoGrupo.SEDE, sede.sedeId]
        );
        grupoId = result.insertId;
        gruposCreados++;
        console.log(`  ✅ Grupo creado para sede ${sede.sedeNombre} (ID: ${grupoId})`);

        // Crear mensaje de bienvenida
        await connection.execute(
          `INSERT INTO mensajes (grupoId, usuarioId, mensajeTexto, mensajeActivo, fechaCreacion, fechaActualizacion) 
           VALUES (?, ?, ?, 1, NOW(), NOW())`,
          [grupoId, sistemaUsuarioId, `🏢 Grupo creado para la sede "${sede.sedeNombre}". Este es el espacio de comunicación para coordinar actividades relacionadas con esta sede.`]
        );
      } else {
        grupoId = grupos[0].grupoId;
        console.log(`  ℹ️  Grupo ya existe para sede ${sede.sedeNombre}`);
      }

      // Asignar superadmins
      for (const superadminId of superadmins) {
        const [existe] = await connection.execute(
          `SELECT usuarioGrupoId FROM usuarios_grupos WHERE grupoId = ? AND usuarioId = ?`,
          [grupoId, superadminId]
        );
        if (existe.length === 0) {
          await connection.execute(
            `INSERT INTO usuarios_grupos (grupoId, usuarioId, activo, fechaIngreso) VALUES (?, ?, 1, NOW())`,
            [grupoId, superadminId]
          );
          usuariosAsignados++;
        }
      }

      // Asignar usuarios con esta sede
      const usuariosSede = usuarios.filter(u => u.usuarioSede === sede.sedeId);
      for (const usuario of usuariosSede) {
        const [existe] = await connection.execute(
          `SELECT usuarioGrupoId FROM usuarios_grupos WHERE grupoId = ? AND usuarioId = ?`,
          [grupoId, usuario.usuarioId]
        );
        if (existe.length === 0) {
          await connection.execute(
            `INSERT INTO usuarios_grupos (grupoId, usuarioId, activo, fechaIngreso) VALUES (?, ?, 1, NOW())`,
            [grupoId, usuario.usuarioId]
          );
          usuariosAsignados++;
        }
      }
      console.log(`  ✅ ${usuariosSede.length} usuarios asignados a sede ${sede.sedeNombre}`);
    }
    console.log('');

    // 5. Sincronizar grupos de oficinas
    console.log('📋 3. Sincronizando grupos de oficinas...');
    const [oficinas] = await connection.execute(`SELECT oficinaId, oficinaNombre FROM oficinas WHERE oficinaEstado = 1`);
    console.log(`  📊 Oficinas encontradas: ${oficinas.length}`);

    for (const oficina of oficinas) {
      let [grupos] = await connection.execute(
        `SELECT grupoId FROM grupos WHERE tipoGrupo = ? AND entidadId = ?`,
        [TipoGrupo.OFICINA, oficina.oficinaId]
      );

      let grupoId;
      if (grupos.length === 0) {
        const [result] = await connection.execute(
          `INSERT INTO grupos (grupoNombre, grupoDescripcion, tipoGrupo, entidadId, grupoActivo, fechaCreacion, fechaActualizacion) 
           VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
          [`Oficina ${oficina.oficinaNombre}`, `Grupo de chat de la oficina ${oficina.oficinaNombre}`, TipoGrupo.OFICINA, oficina.oficinaId]
        );
        grupoId = result.insertId;
        gruposCreados++;
        console.log(`  ✅ Grupo creado para oficina ${oficina.oficinaNombre} (ID: ${grupoId})`);

        // Crear mensaje de bienvenida
        await connection.execute(
          `INSERT INTO mensajes (grupoId, usuarioId, mensajeTexto, mensajeActivo, fechaCreacion, fechaActualizacion) 
           VALUES (?, ?, ?, 1, NOW(), NOW())`,
          [grupoId, sistemaUsuarioId, `🏛️ Grupo creado para la oficina "${oficina.oficinaNombre}". Este es el espacio de comunicación para coordinar actividades relacionadas con esta oficina.`]
        );
      } else {
        grupoId = grupos[0].grupoId;
        console.log(`  ℹ️  Grupo ya existe para oficina ${oficina.oficinaNombre}`);
      }

      // Asignar superadmins
      for (const superadminId of superadmins) {
        const [existe] = await connection.execute(
          `SELECT usuarioGrupoId FROM usuarios_grupos WHERE grupoId = ? AND usuarioId = ?`,
          [grupoId, superadminId]
        );
        if (existe.length === 0) {
          await connection.execute(
            `INSERT INTO usuarios_grupos (grupoId, usuarioId, activo, fechaIngreso) VALUES (?, ?, 1, NOW())`,
            [grupoId, superadminId]
          );
          usuariosAsignados++;
        }
      }

      // Asignar usuarios con esta oficina
      const usuariosOficina = usuarios.filter(u => u.usuarioOficina === oficina.oficinaId);
      for (const usuario of usuariosOficina) {
        const [existe] = await connection.execute(
          `SELECT usuarioGrupoId FROM usuarios_grupos WHERE grupoId = ? AND usuarioId = ?`,
          [grupoId, usuario.usuarioId]
        );
        if (existe.length === 0) {
          await connection.execute(
            `INSERT INTO usuarios_grupos (grupoId, usuarioId, activo, fechaIngreso) VALUES (?, ?, 1, NOW())`,
            [grupoId, usuario.usuarioId]
          );
          usuariosAsignados++;
        }
      }
      console.log(`  ✅ ${usuariosOficina.length} usuarios asignados a oficina ${oficina.oficinaNombre}`);
    }
    console.log('');

    // 6. Sincronizar grupos de bodegas
    console.log('📋 4. Sincronizando grupos de bodegas...');
    const [bodegas] = await connection.execute(`SELECT bodegaId, bodegaNombre FROM bodegas WHERE bodegaEstado = 1`);
    console.log(`  📊 Bodegas encontradas: ${bodegas.length}`);

    for (const bodega of bodegas) {
      let [grupos] = await connection.execute(
        `SELECT grupoId FROM grupos WHERE tipoGrupo = ? AND entidadId = ?`,
        [TipoGrupo.BODEGA, bodega.bodegaId]
      );

      let grupoId;
      if (grupos.length === 0) {
        const [result] = await connection.execute(
          `INSERT INTO grupos (grupoNombre, grupoDescripcion, tipoGrupo, entidadId, grupoActivo, fechaCreacion, fechaActualizacion) 
           VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
          [`Bodega ${bodega.bodegaNombre}`, `Grupo de chat de la bodega ${bodega.bodegaNombre}`, TipoGrupo.BODEGA, bodega.bodegaId]
        );
        grupoId = result.insertId;
        gruposCreados++;
        console.log(`  ✅ Grupo creado para bodega ${bodega.bodegaNombre} (ID: ${grupoId})`);

        // Crear mensaje de bienvenida
        await connection.execute(
          `INSERT INTO mensajes (grupoId, usuarioId, mensajeTexto, mensajeActivo, fechaCreacion, fechaActualizacion) 
           VALUES (?, ?, ?, 1, NOW(), NOW())`,
          [grupoId, sistemaUsuarioId, `🏭 Grupo creado para la bodega "${bodega.bodegaNombre}". Este es el espacio de comunicación para coordinar actividades relacionadas con esta bodega.`]
        );
      } else {
        grupoId = grupos[0].grupoId;
        console.log(`  ℹ️  Grupo ya existe para bodega ${bodega.bodegaNombre}`);
      }

      // Asignar superadmins
      for (const superadminId of superadmins) {
        const [existe] = await connection.execute(
          `SELECT usuarioGrupoId FROM usuarios_grupos WHERE grupoId = ? AND usuarioId = ?`,
          [grupoId, superadminId]
        );
        if (existe.length === 0) {
          await connection.execute(
            `INSERT INTO usuarios_grupos (grupoId, usuarioId, activo, fechaIngreso) VALUES (?, ?, 1, NOW())`,
            [grupoId, superadminId]
          );
          usuariosAsignados++;
        }
      }

      // Asignar usuarios con esta bodega
      const usuariosBodega = usuarios.filter(u => u.usuarioBodega === bodega.bodegaId);
      for (const usuario of usuariosBodega) {
        const [existe] = await connection.execute(
          `SELECT usuarioGrupoId FROM usuarios_grupos WHERE grupoId = ? AND usuarioId = ?`,
          [grupoId, usuario.usuarioId]
        );
        if (existe.length === 0) {
          await connection.execute(
            `INSERT INTO usuarios_grupos (grupoId, usuarioId, activo, fechaIngreso) VALUES (?, ?, 1, NOW())`,
            [grupoId, usuario.usuarioId]
          );
          usuariosAsignados++;
        }
      }
      console.log(`  ✅ ${usuariosBodega.length} usuarios asignados a bodega ${bodega.bodegaNombre}`);
    }
    console.log('');

    // 7. Sincronizar grupos de instalaciones
    console.log('📋 5. Sincronizando grupos de instalaciones...');
    const [instalaciones] = await connection.execute(
      `SELECT i.instalacionId, i.instalacionCodigo, i.identificadorUnico, i.usuarioRegistra, 
              c.clienteNombre, c.clienteApellido 
       FROM instalaciones i 
       LEFT JOIN clientes c ON i.clienteId = c.clienteId`
    );
    console.log(`  📊 Instalaciones encontradas: ${instalaciones.length}`);

    for (const instalacion of instalaciones) {
      const codigoInstalacion = instalacion.identificadorUnico || instalacion.instalacionCodigo || `INST-${instalacion.instalacionId}`;
      
      let [grupos] = await connection.execute(
        `SELECT grupoId FROM grupos WHERE tipoGrupo = ? AND entidadId = ?`,
        [TipoGrupo.INSTALACION, instalacion.instalacionId]
      );

      let grupoId;
      if (grupos.length === 0) {
        const [result] = await connection.execute(
          `INSERT INTO grupos (grupoNombre, grupoDescripcion, tipoGrupo, entidadId, grupoActivo, fechaCreacion, fechaActualizacion) 
           VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
          [`Instalación ${codigoInstalacion}`, `Grupo de chat de la instalación ${codigoInstalacion}`, TipoGrupo.INSTALACION, instalacion.instalacionId]
        );
        grupoId = result.insertId;
        gruposCreados++;
        console.log(`  ✅ Grupo creado para instalación ${codigoInstalacion} (ID: ${grupoId})`);

        // Crear mensaje de bienvenida
        await connection.execute(
          `INSERT INTO mensajes (grupoId, usuarioId, mensajeTexto, mensajeActivo, fechaCreacion, fechaActualizacion) 
           VALUES (?, ?, ?, 1, NOW(), NOW())`,
          [grupoId, sistemaUsuarioId, `🔧 Grupo creado para la instalación "${codigoInstalacion}". Este es el espacio de comunicación para coordinar el trabajo de esta instalación.`]
        );
      } else {
        grupoId = grupos[0].grupoId;
        console.log(`  ℹ️  Grupo ya existe para instalación ${codigoInstalacion}`);
      }

      // Asignar superadmins
      for (const superadminId of superadmins) {
        const [existe] = await connection.execute(
          `SELECT usuarioGrupoId FROM usuarios_grupos WHERE grupoId = ? AND usuarioId = ?`,
          [grupoId, superadminId]
        );
        if (existe.length === 0) {
          await connection.execute(
            `INSERT INTO usuarios_grupos (grupoId, usuarioId, activo, fechaIngreso) VALUES (?, ?, 1, NOW())`,
            [grupoId, superadminId]
          );
          usuariosAsignados++;
        }
      }

      // Asignar usuarios asignados a esta instalación
      const [asignaciones] = await connection.execute(
        `SELECT usuarioId FROM instalaciones_usuarios WHERE instalacionId = ? AND activo = 1`,
        [instalacion.instalacionId]
      );
      
      for (const asignacion of asignaciones) {
        const [existe] = await connection.execute(
          `SELECT usuarioGrupoId FROM usuarios_grupos WHERE grupoId = ? AND usuarioId = ?`,
          [grupoId, asignacion.usuarioId]
        );
        if (existe.length === 0) {
          await connection.execute(
            `INSERT INTO usuarios_grupos (grupoId, usuarioId, activo, fechaIngreso) VALUES (?, ?, 1, NOW())`,
            [grupoId, asignacion.usuarioId]
          );
          usuariosAsignados++;
        }
      }
      console.log(`  ✅ ${asignaciones.length} usuarios asignados a instalación ${codigoInstalacion}`);
    }
    console.log('');

    // 8. Crear notificaciones para instalaciones con usuarios asignados
    console.log('📋 6. Creando notificaciones faltantes...');
    const [asignacionesInstalaciones] = await connection.execute(
      `SELECT iu.instalacionId, iu.usuarioId, 
              i.instalacionCodigo, i.identificadorUnico, i.usuarioRegistra,
              c.clienteNombre, c.clienteApellido
       FROM instalaciones_usuarios iu
       INNER JOIN instalaciones i ON iu.instalacionId = i.instalacionId
       LEFT JOIN clientes c ON i.clienteId = c.clienteId
       WHERE iu.activo = 1`
    );

    for (const asignacion of asignacionesInstalaciones) {
      const codigoInstalacion = asignacion.identificadorUnico || asignacion.instalacionCodigo || `INST-${asignacion.instalacionId}`;
      const clienteNombre = asignacion.clienteNombre || 'Cliente';

      // Obtener supervisor
      let supervisorNombre = 'Sistema';
      if (asignacion.usuarioRegistra) {
        const [supervisor] = await connection.execute(
          `SELECT usuarioNombre, usuarioApellido FROM usuarios WHERE usuarioId = ?`,
          [asignacion.usuarioRegistra]
        );
        if (supervisor.length > 0) {
          const nombre = supervisor[0].usuarioNombre || '';
          const apellido = supervisor[0].usuarioApellido || '';
          supervisorNombre = `${nombre} ${apellido}`.trim() || 'Sistema';
        }
      }

      // Verificar si ya existe notificación
      const [notificacionExistente] = await connection.execute(
        `SELECT notificacionId FROM notificaciones 
         WHERE usuarioId = ? AND instalacionId = ? AND tipoNotificacion = ?`,
        [asignacion.usuarioId, asignacion.instalacionId, TipoNotificacion.INSTALACION_ASIGNADA]
      );

      if (notificacionExistente.length === 0) {
        const datosAdicionales = JSON.stringify({
          instalacionId: asignacion.instalacionId,
          instalacionCodigo: codigoInstalacion,
          clienteNombre,
          supervisorNombre,
        });

        await connection.execute(
          `INSERT INTO notificaciones 
           (usuarioId, tipoNotificacion, titulo, contenido, datosAdicionales, instalacionId, leida, fechaCreacion, fechaActualizacion) 
           VALUES (?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
          [
            asignacion.usuarioId,
            TipoNotificacion.INSTALACION_ASIGNADA,
            'Nueva Instalación Asignada',
            `Se te ha asignado la instalación ${codigoInstalacion} para el cliente ${clienteNombre} por ${supervisorNombre}.`,
            datosAdicionales,
            asignacion.instalacionId,
          ]
        );
        notificacionesCreadas++;
        console.log(`  ✅ Notificación creada para usuario ${asignacion.usuarioId} (instalación ${codigoInstalacion})`);
      }
    }

    console.log('\n✅ Sincronización completada!');
    console.log(`📊 Resumen:`);
    console.log(`   - Grupos creados: ${gruposCreados}`);
    console.log(`   - Usuarios asignados: ${usuariosAsignados}`);
    console.log(`   - Notificaciones creadas: ${notificacionesCreadas}`);

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    if (connection) await connection.end();
    process.exit(1);
  }
}

run();
