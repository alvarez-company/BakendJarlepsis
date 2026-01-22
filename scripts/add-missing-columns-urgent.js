/**
 * Script urgente para agregar columnas faltantes directamente a la base de datos
 * Útil cuando las migraciones TypeORM no se pueden ejecutar
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function addMissingColumns() {
  let connection;

  try {
    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'jarlepsisdev',
      multipleStatements: true,
    };

    console.log('🔌 Conectando a la base de datos...');
    console.log(`   Host: ${config.host}:${config.port}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   User: ${config.user}\n`);

    connection = await mysql.createConnection(config);
    console.log('✅ Conexión establecida\n');

    // 1. Verificar y agregar clienteEstado
    console.log('📝 Verificando columna clienteEstado en clientes...');
    const [clienteEstadoColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'clientes'
        AND COLUMN_NAME = 'clienteEstado'
    `);

    if (clienteEstadoColumns.length === 0) {
      console.log('📝 Agregando columna clienteEstado a clientes...');
      await connection.query(`
        ALTER TABLE \`clientes\` 
        ADD COLUMN \`clienteEstado\` ENUM('activo', 'instalacion_asignada', 'realizando_instalacion') 
        NOT NULL DEFAULT 'activo' AFTER \`cantidadInstalaciones\`
      `);
      console.log('✅ Columna clienteEstado agregada\n');
    } else {
      console.log('✅ Columna clienteEstado ya existe\n');
    }

    // 2. Verificar y agregar unidadMedidaId si falta
    console.log('📝 Verificando columna unidadMedidaId en materiales...');
    const [materialesColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'materiales'
        AND COLUMN_NAME = 'unidadMedidaId'
    `);

    if (materialesColumns.length === 0) {
      console.log('📝 Agregando columna unidadMedidaId a materiales...');
      
      // Primero crear tabla unidades_medida si no existe
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`unidades_medida\` (
          \`unidadMedidaId\` INT NOT NULL AUTO_INCREMENT,
          \`unidadMedidaNombre\` VARCHAR(255) NOT NULL,
          \`unidadMedidaSimbolo\` VARCHAR(255) NULL,
          \`unidadMedidaEstado\` TINYINT NOT NULL DEFAULT 1,
          \`usuarioRegistra\` INT NULL,
          \`fechaCreacion\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`fechaActualizacion\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`unidadMedidaId\`),
          UNIQUE KEY \`unidadMedidaNombre\` (\`unidadMedidaNombre\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Insertar unidades de medida iniciales
      await connection.query(`
        INSERT INTO \`unidades_medida\` (\`unidadMedidaNombre\`, \`unidadMedidaSimbolo\`, \`unidadMedidaEstado\`)
        VALUES
          ('Unidad', 'u', 1),
          ('Kilogramo', 'kg', 1),
          ('Gramo', 'g', 1),
          ('Litro', 'l', 1),
          ('Metro', 'm', 1),
          ('Caja', 'caja', 1),
          ('Paquete', 'paq', 1)
        ON DUPLICATE KEY UPDATE \`unidadMedidaNombre\` = \`unidadMedidaNombre\`
      `);

      // Agregar columna unidadMedidaId
      await connection.query(`
        ALTER TABLE \`materiales\` 
        ADD COLUMN \`unidadMedidaId\` INT NULL AFTER \`materialPrecio\`
      `);

      // Asignar 'Unidad' por defecto
      await connection.query(`
        UPDATE \`materiales\`
        SET \`unidadMedidaId\` = (SELECT \`unidadMedidaId\` FROM \`unidades_medida\` WHERE \`unidadMedidaNombre\` = 'Unidad' LIMIT 1)
        WHERE \`unidadMedidaId\` IS NULL
      `);

      console.log('✅ Columna unidadMedidaId agregada\n');
    } else {
      console.log('✅ Columna unidadMedidaId ya existe\n');
    }

    // 3. Verificar y agregar identificadorUnico si falta
    console.log('📝 Verificando columna identificadorUnico en instalaciones...');
    const [instalacionesColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'instalaciones'
        AND COLUMN_NAME = 'identificadorUnico'
    `);

    if (instalacionesColumns.length === 0) {
      console.log('📝 Agregando columna identificadorUnico a instalaciones...');
      await connection.query(`
        ALTER TABLE \`instalaciones\` 
        ADD COLUMN \`identificadorUnico\` VARCHAR(50) NULL AFTER \`instalacionCodigo\`
      `);
      
      await connection.query(`
        CREATE UNIQUE INDEX \`idx_instalaciones_identificador_unico\` 
        ON \`instalaciones\` (\`identificadorUnico\`)
      `);
      console.log('✅ Columna identificadorUnico agregada\n');
    } else {
      console.log('✅ Columna identificadorUnico ya existe\n');
    }

    // 4. Verificar y agregar usuarioRegistra a proyectos
    console.log('📝 Verificando columna usuarioRegistra en proyectos...');
    const [proyectosColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'proyectos'
        AND COLUMN_NAME = 'usuarioRegistra'
    `);

    if (proyectosColumns.length === 0) {
      console.log('📝 Agregando columna usuarioRegistra a proyectos...');
      await connection.query(`
        ALTER TABLE \`proyectos\` 
        ADD COLUMN \`usuarioRegistra\` INT NULL AFTER \`proyectoEstado\`
      `);
      console.log('✅ Columna usuarioRegistra agregada a proyectos\n');
    } else {
      console.log('✅ Columna usuarioRegistra ya existe en proyectos\n');
    }

    // 5. Verificar y agregar itemNombre e itemCodigo a items_proyecto
    console.log('📝 Verificando columna itemNombre en items_proyecto...');
    const [itemNombreColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'items_proyecto'
        AND COLUMN_NAME = 'itemNombre'
    `);

    if (itemNombreColumns.length === 0) {
      console.log('📝 Agregando columna itemNombre a items_proyecto...');
      await connection.query(`
        ALTER TABLE \`items_proyecto\` 
        ADD COLUMN \`itemNombre\` VARCHAR(255) NOT NULL DEFAULT '' AFTER \`proyectoId\`
      `);
      console.log('✅ Columna itemNombre agregada a items_proyecto\n');
    } else {
      console.log('✅ Columna itemNombre ya existe en items_proyecto\n');
    }

    console.log('📝 Verificando columna itemCodigo en items_proyecto...');
    const [itemCodigoColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'items_proyecto'
        AND COLUMN_NAME = 'itemCodigo'
    `);

    if (itemCodigoColumns.length === 0) {
      console.log('📝 Agregando columna itemCodigo a items_proyecto...');
      await connection.query(`
        ALTER TABLE \`items_proyecto\` 
        ADD COLUMN \`itemCodigo\` VARCHAR(255) NULL AFTER \`itemNombre\`
      `);
      console.log('✅ Columna itemCodigo agregada a items_proyecto\n');
    } else {
      console.log('✅ Columna itemCodigo ya existe en items_proyecto\n');
    }

    // 6. Verificar y agregar usuarioRegistra a items_proyecto
    console.log('📝 Verificando columna usuarioRegistra en items_proyecto...');
    const [itemsProyectoColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'items_proyecto'
        AND COLUMN_NAME = 'usuarioRegistra'
    `);

    if (itemsProyectoColumns.length === 0) {
      console.log('📝 Agregando columna usuarioRegistra a items_proyecto...');
      await connection.query(`
        ALTER TABLE \`items_proyecto\` 
        ADD COLUMN \`usuarioRegistra\` INT NULL AFTER \`itemEstado\`
      `);
      console.log('✅ Columna usuarioRegistra agregada a items_proyecto\n');
    } else {
      console.log('✅ Columna usuarioRegistra ya existe en items_proyecto\n');
    }

    // 7. Verificar y crear tabla clasificaciones si falta
    console.log('📝 Verificando tabla clasificaciones...');
    const [clasificacionesTables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'clasificaciones'
    `);

    if (clasificacionesTables.length === 0) {
      console.log('📝 Creando tabla clasificaciones...');
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`clasificaciones\` (
          \`clasificacionId\` INT NOT NULL AUTO_INCREMENT,
          \`clasificacionNombre\` VARCHAR(255) NOT NULL,
          \`clasificacionDescripcion\` TEXT NULL,
          \`clasificacionEstado\` TINYINT NOT NULL DEFAULT 1,
          \`usuarioRegistra\` INT NULL,
          \`fechaCreacion\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`fechaActualizacion\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`clasificacionId\`),
          UNIQUE KEY \`clasificacionNombre\` (\`clasificacionNombre\`),
          KEY \`FK_clasificacion_usuario\` (\`usuarioRegistra\`),
          CONSTRAINT \`FK_clasificacion_usuario\` FOREIGN KEY (\`usuarioRegistra\`) REFERENCES \`usuarios\` (\`usuarioId\`) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Tabla clasificaciones creada\n');
    } else {
      console.log('✅ Tabla clasificaciones ya existe\n');
    }

    // 8. Verificar y crear tabla asignaciones_tecnicos si falta
    console.log('📝 Verificando tabla asignaciones_tecnicos...');
    const [asignacionesTecnicosTables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'asignaciones_tecnicos'
    `);

    if (asignacionesTecnicosTables.length === 0) {
      console.log('📝 Creando tabla asignaciones_tecnicos...');
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`asignaciones_tecnicos\` (
          \`asignacionTecnicoId\` INT NOT NULL AUTO_INCREMENT,
          \`asignacionCodigo\` VARCHAR(255) NOT NULL,
          \`usuarioId\` INT NOT NULL,
          \`inventarioId\` INT NOT NULL,
          \`usuarioAsignadorId\` INT NOT NULL,
          \`materiales\` JSON NOT NULL,
          \`observaciones\` TEXT NULL,
          \`asignacionEstado\` ENUM('pendiente', 'aprobada', 'rechazada') NOT NULL DEFAULT 'pendiente',
          \`fechaCreacion\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`fechaActualizacion\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`asignacionTecnicoId\`),
          UNIQUE KEY \`UQ_asignacion_codigo\` (\`asignacionCodigo\`),
          INDEX \`idx_asignaciones_tecnicos_usuario\` (\`usuarioId\`),
          INDEX \`idx_asignaciones_tecnicos_inventario\` (\`inventarioId\`),
          INDEX \`idx_asignaciones_tecnicos_asignador\` (\`usuarioAsignadorId\`),
          INDEX \`idx_asignaciones_tecnicos_fecha\` (\`fechaCreacion\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Agregar foreign keys
      try {
        await connection.query(`
          ALTER TABLE \`asignaciones_tecnicos\` 
          ADD CONSTRAINT \`FK_asignaciones_tecnicos_usuario\` 
          FOREIGN KEY (\`usuarioId\`) 
          REFERENCES \`usuarios\`(\`usuarioId\`) 
          ON DELETE CASCADE
        `);
      } catch (error) {
        console.warn('⚠️  No se pudo agregar FK a usuarios:', error.message);
      }

      try {
        await connection.query(`
          ALTER TABLE \`asignaciones_tecnicos\` 
          ADD CONSTRAINT \`FK_asignaciones_tecnicos_inventario\` 
          FOREIGN KEY (\`inventarioId\`) 
          REFERENCES \`inventarios\`(\`inventarioId\`) 
          ON DELETE CASCADE
        `);
      } catch (error) {
        console.warn('⚠️  No se pudo agregar FK a inventarios:', error.message);
      }

      try {
        await connection.query(`
          ALTER TABLE \`asignaciones_tecnicos\` 
          ADD CONSTRAINT \`FK_asignaciones_tecnicos_asignador\` 
          FOREIGN KEY (\`usuarioAsignadorId\`) 
          REFERENCES \`usuarios\`(\`usuarioId\`) 
          ON DELETE CASCADE
        `);
      } catch (error) {
        console.warn('⚠️  No se pudo agregar FK a usuarioAsignador:', error.message);
      }

      console.log('✅ Tabla asignaciones_tecnicos creada\n');
    } else {
      console.log('✅ Tabla asignaciones_tecnicos ya existe\n');
    }

    // 9. Verificar y crear tabla inventario_tecnicos si falta
    console.log('📝 Verificando tabla inventario_tecnicos...');
    const [inventarioTecnicosTables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'inventario_tecnicos'
    `);

    if (inventarioTecnicosTables.length === 0) {
      console.log('📝 Creando tabla inventario_tecnicos...');
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`inventario_tecnicos\` (
          \`inventarioTecnicoId\` INT NOT NULL AUTO_INCREMENT,
          \`usuarioId\` INT NOT NULL,
          \`materialId\` INT NOT NULL,
          \`cantidad\` DECIMAL(10, 2) NOT NULL DEFAULT 0,
          \`fechaCreacion\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`fechaActualizacion\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`inventarioTecnicoId\`),
          INDEX \`idx_inventario_tecnicos_usuario\` (\`usuarioId\`),
          INDEX \`idx_inventario_tecnicos_material\` (\`materialId\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Agregar foreign keys
      try {
        await connection.query(`
          ALTER TABLE \`inventario_tecnicos\` 
          ADD CONSTRAINT \`FK_inventario_tecnicos_usuario\` 
          FOREIGN KEY (\`usuarioId\`) 
          REFERENCES \`usuarios\`(\`usuarioId\`) 
          ON DELETE CASCADE
        `);
      } catch (error) {
        console.warn('⚠️  No se pudo agregar FK a usuarios:', error.message);
      }

      try {
        await connection.query(`
          ALTER TABLE \`inventario_tecnicos\` 
          ADD CONSTRAINT \`FK_inventario_tecnicos_material\` 
          FOREIGN KEY (\`materialId\`) 
          REFERENCES \`materiales\`(\`materialId\`) 
          ON DELETE CASCADE
        `);
      } catch (error) {
        console.warn('⚠️  No se pudo agregar FK a materiales:', error.message);
      }

      console.log('✅ Tabla inventario_tecnicos creada\n');
    } else {
      console.log('✅ Tabla inventario_tecnicos ya existe\n');
    }

    // 10. Verificar y crear tabla instalaciones_materiales si falta
    console.log('📝 Verificando tabla instalaciones_materiales...');
    const [instalacionesMaterialesTables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'instalaciones_materiales'
    `);

    if (instalacionesMaterialesTables.length === 0) {
      console.log('📝 Creando tabla instalaciones_materiales...');
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`instalaciones_materiales\` (
          \`instalacionMaterialId\` INT NOT NULL AUTO_INCREMENT,
          \`instalacionId\` INT NOT NULL,
          \`materialId\` INT NOT NULL,
          \`cantidad\` DECIMAL(10, 2) NOT NULL,
          \`observaciones\` TEXT NULL,
          \`materialAprobado\` TINYINT NULL DEFAULT NULL,
          \`fechaCreacion\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`fechaActualizacion\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`instalacionMaterialId\`),
          INDEX \`idx_instalaciones_materiales_instalacion\` (\`instalacionId\`),
          INDEX \`idx_instalaciones_materiales_material\` (\`materialId\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Agregar foreign keys
      try {
        await connection.query(`
          ALTER TABLE \`instalaciones_materiales\` 
          ADD CONSTRAINT \`FK_instalaciones_materiales_instalacion\` 
          FOREIGN KEY (\`instalacionId\`) 
          REFERENCES \`instalaciones\`(\`instalacionId\`) 
          ON DELETE CASCADE
        `);
      } catch (error) {
        console.warn('⚠️  No se pudo agregar FK a instalaciones:', error.message);
      }

      try {
        await connection.query(`
          ALTER TABLE \`instalaciones_materiales\` 
          ADD CONSTRAINT \`FK_instalaciones_materiales_material\` 
          FOREIGN KEY (\`materialId\`) 
          REFERENCES \`materiales\`(\`materialId\`) 
          ON DELETE CASCADE
        `);
      } catch (error) {
        console.warn('⚠️  No se pudo agregar FK a materiales:', error.message);
      }

      console.log('✅ Tabla instalaciones_materiales creada\n');
    } else {
      console.log('✅ Tabla instalaciones_materiales ya existe\n');
    }

    // 11. Verificar y crear tabla numeros_medidor si falta
    console.log('📝 Verificando tabla numeros_medidor...');
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'numeros_medidor'
    `);

    if (tables.length === 0) {
      console.log('📝 Creando tabla numeros_medidor...');
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`numeros_medidor\` (
          \`numeroMedidorId\` INT NOT NULL AUTO_INCREMENT,
          \`materialId\` INT NOT NULL,
          \`numeroMedidor\` VARCHAR(255) NOT NULL,
          \`estado\` ENUM('disponible', 'asignado_tecnico', 'en_instalacion', 'instalado') NOT NULL DEFAULT 'disponible',
          \`inventarioTecnicoId\` INT NULL,
          \`instalacionMaterialId\` INT NULL,
          \`usuarioId\` INT NULL,
          \`instalacionId\` INT NULL,
          \`observaciones\` TEXT NULL,
          \`fechaCreacion\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`fechaActualizacion\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`numeroMedidorId\`),
          UNIQUE KEY \`UQ_numero_medidor\` (\`numeroMedidor\`),
          INDEX \`idx_numeros_medidor_material\` (\`materialId\`),
          INDEX \`idx_numeros_medidor_usuario\` (\`usuarioId\`),
          INDEX \`idx_numeros_medidor_instalacion\` (\`instalacionId\`),
          INDEX \`idx_numeros_medidor_estado\` (\`estado\`),
          INDEX \`idx_numeros_medidor_inventario_tecnico\` (\`inventarioTecnicoId\`),
          INDEX \`idx_numeros_medidor_instalacion_material\` (\`instalacionMaterialId\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Agregar foreign keys
      try {
        await connection.query(`
          ALTER TABLE \`numeros_medidor\` 
          ADD CONSTRAINT \`FK_numeros_medidor_material\` 
          FOREIGN KEY (\`materialId\`) 
          REFERENCES \`materiales\`(\`materialId\`) 
          ON DELETE CASCADE
        `);
      } catch (error) {
        console.warn('⚠️  No se pudo agregar FK a materiales:', error.message);
      }

      try {
        await connection.query(`
          ALTER TABLE \`numeros_medidor\` 
          ADD CONSTRAINT \`FK_numeros_medidor_usuario\` 
          FOREIGN KEY (\`usuarioId\`) 
          REFERENCES \`usuarios\`(\`usuarioId\`) 
          ON DELETE SET NULL
        `);
      } catch (error) {
        console.warn('⚠️  No se pudo agregar FK a usuarios:', error.message);
      }

      console.log('✅ Tabla numeros_medidor creada\n');
    } else {
      console.log('✅ Tabla numeros_medidor ya existe\n');
    }

    console.log('✅ Todas las columnas y tablas críticas han sido verificadas/agregadas\n');

  } catch (error) {
    console.error('❌ Error ejecutando el script:');
    console.error(error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión cerrada');
    }
  }
}

addMissingColumns();
