/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function runMigration() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'jarlepsisdev';

  const migrationFile = path.resolve(__dirname, '../migrations/0003_add_missing_columns.sql');

  console.log('🔧 Agregando columnas faltantes a tablas existentes...\n');
  console.log('📋 Configuración:');
  console.log(`   Host: ${host}`);
  console.log(`   Puerto: ${port}`);
  console.log(`   Usuario: ${user}`);
  console.log(`   Base de datos: ${database}`);
  console.log(`   Archivo: ${migrationFile}\n`);

  if (!fs.existsSync(migrationFile)) {
    console.error(`❌ Error: No se encontró el archivo de migración: ${migrationFile}`);
    process.exit(1);
  }

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      multipleStatements: true,
      connectTimeout: 30000,
    });

    console.log('✅ Conectado a la base de datos\n');

    console.log('📦 Leyendo archivo de migración...');
    let sql = fs.readFileSync(migrationFile, 'utf8');

    // MySQL no soporta IF NOT EXISTS en ALTER TABLE ADD COLUMN directamente
    // Necesitamos verificar primero y luego agregar
    console.log('🔍 Verificando columnas existentes...\n');

    // Verificar y agregar columnas a sedes
    const [sedesColumns] = await connection.query('SHOW COLUMNS FROM sedes LIKE ?', ['sedeCorreo']);
    if (sedesColumns.length === 0) {
      console.log('➕ Agregando sedeCorreo a sedes...');
      await connection.query('ALTER TABLE `sedes` ADD COLUMN `sedeCorreo` varchar(255) DEFAULT NULL AFTER `sedeTelefono`');
    } else {
      console.log('✓ sedeCorreo ya existe en sedes');
    }

    const [sedesFotoColumns] = await connection.query('SHOW COLUMNS FROM sedes LIKE ?', ['sedeFoto']);
    if (sedesFotoColumns.length === 0) {
      console.log('➕ Agregando sedeFoto a sedes...');
      await connection.query('ALTER TABLE `sedes` ADD COLUMN `sedeFoto` longtext DEFAULT NULL AFTER `sedeCorreo`');
    } else {
      console.log('✓ sedeFoto ya existe en sedes');
    }

    // Verificar y agregar columnas a oficinas
    const [oficinasCorreoColumns] = await connection.query('SHOW COLUMNS FROM oficinas LIKE ?', ['oficinaCorreo']);
    if (oficinasCorreoColumns.length === 0) {
      console.log('➕ Agregando oficinaCorreo a oficinas...');
      await connection.query('ALTER TABLE `oficinas` ADD COLUMN `oficinaCorreo` varchar(255) DEFAULT NULL AFTER `oficinaTelefono`');
    } else {
      console.log('✓ oficinaCorreo ya existe en oficinas');
    }

    const [oficinasFotoColumns] = await connection.query('SHOW COLUMNS FROM oficinas LIKE ?', ['oficinaFoto']);
    if (oficinasFotoColumns.length === 0) {
      console.log('➕ Agregando oficinaFoto a oficinas...');
      await connection.query('ALTER TABLE `oficinas` ADD COLUMN `oficinaFoto` longtext DEFAULT NULL AFTER `oficinaCorreo`');
    } else {
      console.log('✓ oficinaFoto ya existe en oficinas');
    }

    // Verificar y agregar clienteBarrio
    const [clienteBarrioColumns] = await connection.query('SHOW COLUMNS FROM clientes LIKE ?', ['clienteBarrio']);
    if (clienteBarrioColumns.length === 0) {
      console.log('➕ Agregando clienteBarrio a clientes...');
      await connection.query('ALTER TABLE `clientes` ADD COLUMN `clienteBarrio` varchar(255) DEFAULT NULL AFTER `clienteDireccion`');
    } else {
      console.log('✓ clienteBarrio ya existe en clientes');
    }

    // Verificar y agregar clasificacionId a instalaciones
    const [instalacionClasificacionColumns] = await connection.query('SHOW COLUMNS FROM instalaciones LIKE ?', ['clasificacionId']);
    if (instalacionClasificacionColumns.length === 0) {
      console.log('➕ Agregando clasificacionId a instalaciones...');
      await connection.query('ALTER TABLE `instalaciones` ADD COLUMN `clasificacionId` int DEFAULT NULL AFTER `clienteId`');
      
      // Agregar índice y foreign key
      const [indexes] = await connection.query("SHOW INDEXES FROM instalaciones WHERE Key_name = 'FK_instalacion_clasificacion'");
      if (indexes.length === 0) {
        await connection.query('ALTER TABLE `instalaciones` ADD INDEX `FK_instalacion_clasificacion` (`clasificacionId`)');
        await connection.query('ALTER TABLE `instalaciones` ADD CONSTRAINT `FK_instalacion_clasificacion` FOREIGN KEY (`clasificacionId`) REFERENCES `clasificaciones` (`clasificacionId`) ON DELETE NO ACTION ON UPDATE NO ACTION');
      }
    } else {
      console.log('✓ clasificacionId ya existe en instalaciones');
    }

    // Verificar y eliminar tipoProyectoId de proyectos si existe
    const [proyectoTipoColumns] = await connection.query('SHOW COLUMNS FROM proyectos LIKE ?', ['tipoProyectoId']);
    if (proyectoTipoColumns.length > 0) {
      console.log('➖ Eliminando tipoProyectoId de proyectos...');
      try {
        await connection.query('ALTER TABLE `proyectos` DROP FOREIGN KEY `FK_a1900389f6aa7305d2018fc9e18`');
      } catch (e) {
        // Ignorar si no existe
      }
      await connection.query('ALTER TABLE `proyectos` DROP COLUMN `tipoProyectoId`');
    } else {
      console.log('✓ tipoProyectoId ya no existe en proyectos');
    }

    // Verificar y agregar usuarioRegistra a proyectos
    const [proyectoUsuarioColumns] = await connection.query('SHOW COLUMNS FROM proyectos LIKE ?', ['usuarioRegistra']);
    if (proyectoUsuarioColumns.length === 0) {
      console.log('➕ Agregando usuarioRegistra a proyectos...');
      await connection.query('ALTER TABLE `proyectos` ADD COLUMN `usuarioRegistra` int DEFAULT NULL AFTER `proyectoCodigo`');
    } else {
      console.log('✓ usuarioRegistra ya existe en proyectos');
    }

    // Verificar y actualizar items_proyecto
    const [itemMaterialColumns] = await connection.query('SHOW COLUMNS FROM items_proyecto LIKE ?', ['materialId']);
    if (itemMaterialColumns.length > 0) {
      console.log('➖ Eliminando materialId de items_proyecto...');
      try {
        await connection.query('ALTER TABLE `items_proyecto` DROP FOREIGN KEY `FK_b4f373909da9224964e354e155c`');
      } catch (e) {
        // Ignorar si no existe
      }
      await connection.query('ALTER TABLE `items_proyecto` DROP COLUMN `materialId`');
    }

    const [itemCantidadColumns] = await connection.query('SHOW COLUMNS FROM items_proyecto LIKE ?', ['itemCantidad']);
    if (itemCantidadColumns.length > 0) {
      console.log('➖ Eliminando itemCantidad de items_proyecto...');
      await connection.query('ALTER TABLE `items_proyecto` DROP COLUMN `itemCantidad`');
    }

    const [itemNombreColumns] = await connection.query('SHOW COLUMNS FROM items_proyecto LIKE ?', ['itemNombre']);
    if (itemNombreColumns.length === 0) {
      console.log('➕ Agregando itemNombre a items_proyecto...');
      await connection.query('ALTER TABLE `items_proyecto` ADD COLUMN `itemNombre` varchar(255) NOT NULL AFTER `proyectoId`');
    } else {
      console.log('✓ itemNombre ya existe en items_proyecto');
    }

    const [itemCodigoColumns] = await connection.query('SHOW COLUMNS FROM items_proyecto LIKE ?', ['itemCodigo']);
    if (itemCodigoColumns.length === 0) {
      console.log('➕ Agregando itemCodigo a items_proyecto...');
      await connection.query('ALTER TABLE `items_proyecto` ADD COLUMN `itemCodigo` varchar(255) DEFAULT NULL AFTER `itemNombre`');
    } else {
      console.log('✓ itemCodigo ya existe en items_proyecto');
    }

    const [itemUsuarioColumns] = await connection.query('SHOW COLUMNS FROM items_proyecto LIKE ?', ['usuarioRegistra']);
    if (itemUsuarioColumns.length === 0) {
      console.log('➕ Agregando usuarioRegistra a items_proyecto...');
      await connection.query('ALTER TABLE `items_proyecto` ADD COLUMN `usuarioRegistra` int DEFAULT NULL AFTER `itemDescripcion`');
    } else {
      console.log('✓ usuarioRegistra ya existe en items_proyecto');
    }

    // Actualizar enum de grupos
    console.log('🔄 Actualizando enum tipoGrupo en grupos...');
    try {
      await connection.query("ALTER TABLE `grupos` MODIFY COLUMN `tipoGrupo` enum('general','sede','oficina','bodega','instalacion','directo') NOT NULL DEFAULT 'general'");
      console.log('✓ Enum tipoGrupo actualizado');
    } catch (e) {
      console.log('⚠️  Error actualizando enum tipoGrupo:', e.message);
    }

    // Actualizar enum de notificaciones
    console.log('🔄 Actualizando enum tipoNotificacion en notificaciones...');
    try {
      await connection.query("ALTER TABLE `notificaciones` MODIFY COLUMN `tipoNotificacion` enum('mensaje_nuevo','reaccion_mensaje','instalacion_completada','instalacion_asignada','instalacion_en_proceso','instalacion_cancelada','instalacion_asignacion','instalacion_construccion','instalacion_certificacion','instalacion_novedad','instalacion_anulada','mensaje_respondido','usuario_ingreso_grupo','usuario_salio_grupo') NOT NULL");
      console.log('✓ Enum tipoNotificacion actualizado');
    } catch (e) {
      console.log('⚠️  Error actualizando enum tipoNotificacion:', e.message);
    }

    console.log('\n✅ Migración completada exitosamente!\n');

  } catch (err) {
    console.error('❌ Error ejecutando migración:', err.message);
    if (err.sql) {
      console.error('SQL Error:', err.sql.substring(0, 200));
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end().catch(() => {});
    }
  }
}

runMigration();
