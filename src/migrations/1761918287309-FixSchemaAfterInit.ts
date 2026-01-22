import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración consolidada para ajustar el esquema después de InitSchema
 * Asegura que todas las columnas necesarias existan para que las entidades funcionen correctamente
 * Se ejecuta después de InitSchema para corregir cualquier desincronización
 */
export class FixSchemaAfterInit1761918287309 implements MigrationInterface {
  name = 'FixSchemaAfterInit1761918287309';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. USUARIOS: Agregar usuarioFoto si no existe
    // ============================================
    const usuariosTable = await queryRunner.getTable('usuarios');
    const usuarioFotoColumn = usuariosTable?.findColumnByName('usuarioFoto');
    if (!usuarioFotoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`usuarios\` 
        ADD COLUMN \`usuarioFoto\` LONGTEXT NULL AFTER \`usuarioCreador\`;
      `);
    }

    // Eliminar usuarioOficina si existe (ya no se usa)
    const usuarioOficinaColumn = usuariosTable?.findColumnByName('usuarioOficina');
    if (usuarioOficinaColumn) {
      // Primero eliminar foreign key si existe
      try {
        const fkName = await queryRunner.query(`
          SELECT CONSTRAINT_NAME 
          FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'usuarios'
            AND COLUMN_NAME = 'usuarioOficina'
            AND CONSTRAINT_NAME IS NOT NULL
          LIMIT 1;
        `);
        
        if (fkName && fkName.length > 0 && fkName[0].CONSTRAINT_NAME) {
          await queryRunner.query(`
            ALTER TABLE \`usuarios\` 
            DROP FOREIGN KEY \`${fkName[0].CONSTRAINT_NAME}\`;
          `);
        }
      } catch (error) {
        // Ignorar si no existe la FK
      }
      
      await queryRunner.query(`
        ALTER TABLE \`usuarios\` 
        DROP COLUMN \`usuarioOficina\`;
      `);
    }

    // ============================================
    // 2. SEDES: Agregar sedeCorreo y sedeFoto si no existen
    // ============================================
    const sedesTable = await queryRunner.getTable('sedes');
    
    const sedeCorreoColumn = sedesTable?.findColumnByName('sedeCorreo');
    if (!sedeCorreoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`sedes\` 
        ADD COLUMN \`sedeCorreo\` VARCHAR(255) NULL AFTER \`sedeTelefono\`;
      `);
    }

    const sedeFotoColumn = sedesTable?.findColumnByName('sedeFoto');
    if (!sedeFotoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`sedes\` 
        ADD COLUMN \`sedeFoto\` LONGTEXT NULL AFTER \`sedeCorreo\`;
      `);
    }

    // ============================================
    // 3. BODEGAS: Agregar todas las columnas faltantes
    // ============================================
    const bodegasTable = await queryRunner.getTable('bodegas');
    
    // Agregar sedeId si no existe (manejar migración de oficinaId a sedeId)
    const sedeIdColumn = bodegasTable?.findColumnByName('sedeId');
    const oficinaIdColumn = bodegasTable?.findColumnByName('oficinaId');
    
    if (!sedeIdColumn) {
      if (oficinaIdColumn) {
        // Si existe oficinaId, agregar sedeId y migrar datos
        await queryRunner.query(`
          ALTER TABLE \`bodegas\` 
          ADD COLUMN \`sedeId\` INT NULL AFTER \`oficinaId\`;
        `);
        
        // Intentar migrar datos desde oficinas si existe la tabla y hay datos
        try {
          const hasData = await queryRunner.query(`
            SELECT COUNT(*) as count FROM \`bodegas\`;
          `);
          
          if (hasData && hasData[0] && hasData[0].count > 0) {
            // Solo migrar si hay datos
            await queryRunner.query(`
              UPDATE \`bodegas\` b
              INNER JOIN \`oficinas\` o ON b.oficinaId = o.oficinaId
              SET b.sedeId = o.sedeId
              WHERE b.sedeId IS NULL;
            `);
          }
        } catch (error) {
          // Si no existe la tabla oficinas o hay error, continuar
        }
        
        // Hacer sedeId NOT NULL después de migrar (o si no hay datos)
        await queryRunner.query(`
          ALTER TABLE \`bodegas\` 
          MODIFY COLUMN \`sedeId\` INT NOT NULL;
        `);
      } else {
        // Si no existe oficinaId, agregar sedeId directamente como NOT NULL
        await queryRunner.query(`
          ALTER TABLE \`bodegas\` 
          ADD COLUMN \`sedeId\` INT NOT NULL AFTER \`bodegaEstado\`;
        `);
      }
    }

    // Agregar bodegaTelefono si no existe
    const bodegaTelefonoColumn = bodegasTable?.findColumnByName('bodegaTelefono');
    if (!bodegaTelefonoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`bodegas\` 
        ADD COLUMN \`bodegaTelefono\` VARCHAR(255) NULL AFTER \`bodegaUbicacion\`;
      `);
    }

    // Agregar bodegaCorreo si no existe
    const bodegaCorreoColumn = bodegasTable?.findColumnByName('bodegaCorreo');
    if (!bodegaCorreoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`bodegas\` 
        ADD COLUMN \`bodegaCorreo\` VARCHAR(255) NULL AFTER \`bodegaTelefono\`;
      `);
    }

    // Agregar bodegaFoto si no existe
    const bodegaFotoColumn = bodegasTable?.findColumnByName('bodegaFoto');
    if (!bodegaFotoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`bodegas\` 
        ADD COLUMN \`bodegaFoto\` LONGTEXT NULL AFTER \`bodegaCorreo\`;
      `);
    }

    // Agregar bodegaTipo si no existe
    const bodegaTipoColumn = bodegasTable?.findColumnByName('bodegaTipo');
    if (!bodegaTipoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`bodegas\` 
        ADD COLUMN \`bodegaTipo\` VARCHAR(50) NULL AFTER \`bodegaEstado\`;
      `);
    }

    // Agregar foreign key de sedeId si no existe
    try {
      const fkExists = await queryRunner.query(`
        SELECT COUNT(*) as count
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'bodegas'
          AND COLUMN_NAME = 'sedeId'
          AND CONSTRAINT_NAME IS NOT NULL
          AND REFERENCED_TABLE_NAME = 'sedes';
      `);
      
      if (fkExists && fkExists[0] && fkExists[0].count === 0) {
        await queryRunner.query(`
          ALTER TABLE \`bodegas\` 
          ADD CONSTRAINT \`fk_bodegas_sede\` 
          FOREIGN KEY (\`sedeId\`) 
          REFERENCES \`sedes\`(\`sedeId\`) 
          ON DELETE RESTRICT 
          ON UPDATE CASCADE;
        `);
      }
    } catch (error) {
      // Ignorar si ya existe la FK
    }

    // ============================================
    // 4. MATERIALES: Agregar unidadMedidaId y crear tabla unidades_medida
    // ============================================
    // Crear tabla unidades_medida si no existe
    const unidadesMedidaTable = await queryRunner.getTable('unidades_medida');
    if (!unidadesMedidaTable) {
      await queryRunner.query(`
        CREATE TABLE \`unidades_medida\` (
          \`unidadMedidaId\` INT NOT NULL AUTO_INCREMENT,
          \`unidadMedidaNombre\` VARCHAR(255) NOT NULL,
          \`unidadMedidaSimbolo\` VARCHAR(255) NULL,
          \`unidadMedidaEstado\` TINYINT NOT NULL DEFAULT 1,
          \`usuarioRegistra\` INT NULL,
          \`fechaCreacion\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`fechaActualizacion\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`unidadMedidaId\`),
          UNIQUE KEY \`unidadMedidaNombre\` (\`unidadMedidaNombre\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // Insertar unidades de medida iniciales
      await queryRunner.query(`
        INSERT INTO \`unidades_medida\` (\`unidadMedidaNombre\`, \`unidadMedidaSimbolo\`, \`unidadMedidaEstado\`)
        VALUES
          ('Unidad', 'u', 1),
          ('Kilogramo', 'kg', 1),
          ('Gramo', 'g', 1),
          ('Litro', 'l', 1),
          ('Metro', 'm', 1),
          ('Caja', 'caja', 1),
          ('Paquete', 'paq', 1)
        ON DUPLICATE KEY UPDATE \`unidadMedidaNombre\` = \`unidadMedidaNombre\`;
      `);
    }

    // Agregar unidadMedidaId a materiales si no existe
    const materialesTable = await queryRunner.getTable('materiales');
    const unidadMedidaIdColumn = materialesTable?.findColumnByName('unidadMedidaId');
    if (!unidadMedidaIdColumn) {
      await queryRunner.query(`
        ALTER TABLE \`materiales\` 
        ADD COLUMN \`unidadMedidaId\` INT NULL AFTER \`materialPrecio\`;
      `);

      // Asignar 'Unidad' por defecto a materiales sin unidadMedidaId
      try {
        await queryRunner.query(`
          UPDATE \`materiales\`
          SET \`unidadMedidaId\` = (SELECT \`unidadMedidaId\` FROM \`unidades_medida\` WHERE \`unidadMedidaNombre\` = 'Unidad' LIMIT 1)
          WHERE \`unidadMedidaId\` IS NULL;
        `);
      } catch (error) {
        // Ignorar si hay error
      }

      // Agregar foreign key si no existe
      try {
        const fkExists = await queryRunner.query(`
          SELECT COUNT(*) as count
          FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'materiales'
            AND COLUMN_NAME = 'unidadMedidaId'
            AND CONSTRAINT_NAME IS NOT NULL
            AND REFERENCED_TABLE_NAME = 'unidades_medida';
        `);
        
        if (fkExists && fkExists[0] && fkExists[0].count === 0) {
          await queryRunner.query(`
            ALTER TABLE \`materiales\` 
            ADD CONSTRAINT \`FK_material_unidad_medida\` 
            FOREIGN KEY (\`unidadMedidaId\`) 
            REFERENCES \`unidades_medida\`(\`unidadMedidaId\`) 
            ON DELETE SET NULL;
          `);
        }
      } catch (error) {
        // Ignorar si ya existe la FK
      }
    }

    // Agregar materialEsMedidor si no existe
    const materialEsMedidorColumn = materialesTable?.findColumnByName('materialEsMedidor');
    if (!materialEsMedidorColumn) {
      await queryRunner.query(`
        ALTER TABLE \`materiales\` 
        ADD COLUMN \`materialEsMedidor\` TINYINT NOT NULL DEFAULT 0 AFTER \`materialEstado\`;
      `);
    }

    // Cambiar materialFoto de VARCHAR a LONGTEXT si es necesario
    const materialFotoColumn = materialesTable?.findColumnByName('materialFoto');
    if (materialFotoColumn && materialFotoColumn.type !== 'longtext') {
      await queryRunner.query(`
        ALTER TABLE \`materiales\` 
        MODIFY COLUMN \`materialFoto\` LONGTEXT NULL;
      `);
    }

    // ============================================
    // 5. INSTALACIONES: Agregar todas las columnas faltantes
    // ============================================
    const instalacionesTable = await queryRunner.getTable('instalaciones');

    // Agregar identificadorUnico si no existe
    const identificadorUnicoColumn = instalacionesTable?.findColumnByName('identificadorUnico');
    if (!identificadorUnicoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\` 
        ADD COLUMN \`identificadorUnico\` VARCHAR(50) NULL UNIQUE AFTER \`instalacionCodigo\`;
      `);
      
      // Crear índice único si no existe
      try {
        await queryRunner.query(`
          CREATE UNIQUE INDEX \`idx_instalaciones_identificador_unico\` 
          ON \`instalaciones\` (\`identificadorUnico\`);
        `);
      } catch (error) {
        // Ignorar si ya existe el índice
      }
    }

    // Agregar instalacionSelloRegulador si no existe
    const instalacionSelloReguladorColumn = instalacionesTable?.findColumnByName('instalacionSelloRegulador');
    if (!instalacionSelloReguladorColumn) {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\` 
        ADD COLUMN \`instalacionSelloRegulador\` VARCHAR(255) NULL AFTER \`instalacionSelloNumero\`;
      `);
    }

    // Agregar instalacionFecha (DATE) si no existe (separado de instalacionFechaHora)
    const instalacionFechaColumn = instalacionesTable?.findColumnByName('instalacionFecha');
    if (!instalacionFechaColumn) {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\` 
        ADD COLUMN \`instalacionFecha\` DATE NULL AFTER \`instalacionSelloRegulador\`;
      `);
    }

    // Agregar fechaAsignacionMetrogas si no existe
    const fechaAsignacionMetrogasColumn = instalacionesTable?.findColumnByName('fechaAsignacionMetrogas');
    if (!fechaAsignacionMetrogasColumn) {
      // Primero agregar como NULL para evitar problemas con datos existentes
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\` 
        ADD COLUMN \`fechaAsignacionMetrogas\` DATE NULL AFTER \`instalacionFecha\`;
      `);
      
      // Asignar fecha por defecto a registros existentes si no tienen fecha
      try {
        await queryRunner.query(`
          UPDATE \`instalaciones\`
          SET \`fechaAsignacionMetrogas\` = COALESCE(\`instalacionFecha\`, CURDATE())
          WHERE \`fechaAsignacionMetrogas\` IS NULL;
        `);
      } catch (error) {
        // Ignorar si hay error
      }
      
      // Luego hacer NOT NULL si no hay datos o después de asignar valores
      try {
        await queryRunner.query(`
          ALTER TABLE \`instalaciones\` 
          MODIFY COLUMN \`fechaAsignacionMetrogas\` DATE NOT NULL;
        `);
      } catch (error) {
        // Si falla, mantener como NULL (puede haber datos sin fecha)
      }
    }

    // Agregar fechaAsignacion si no existe
    const fechaAsignacionColumn = instalacionesTable?.findColumnByName('fechaAsignacion');
    if (!fechaAsignacionColumn) {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\` 
        ADD COLUMN \`fechaAsignacion\` DATETIME NULL AFTER \`fechaAsignacionMetrogas\`;
      `);
    }

    // Agregar fechaConstruccion si no existe
    const fechaConstruccionColumn = instalacionesTable?.findColumnByName('fechaConstruccion');
    if (!fechaConstruccionColumn) {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\` 
        ADD COLUMN \`fechaConstruccion\` DATETIME NULL AFTER \`fechaAsignacion\`;
      `);
    }

    // Agregar fechaCertificacion si no existe
    const fechaCertificacionColumn = instalacionesTable?.findColumnByName('fechaCertificacion');
    if (!fechaCertificacionColumn) {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\` 
        ADD COLUMN \`fechaCertificacion\` DATETIME NULL AFTER \`fechaConstruccion\`;
      `);
    }

    // Agregar fechaAnulacion si no existe
    const fechaAnulacionColumn = instalacionesTable?.findColumnByName('fechaAnulacion');
    if (!fechaAnulacionColumn) {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\` 
        ADD COLUMN \`fechaAnulacion\` DATETIME NULL AFTER \`fechaCertificacion\`;
      `);
    }

    // Agregar fechaNovedad si no existe
    const fechaNovedadColumn = instalacionesTable?.findColumnByName('fechaNovedad');
    if (!fechaNovedadColumn) {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\` 
        ADD COLUMN \`fechaNovedad\` DATETIME NULL AFTER \`fechaAnulacion\`;
      `);
    }

    // Agregar fechaFinalizacion si no existe
    const fechaFinalizacionColumn = instalacionesTable?.findColumnByName('fechaFinalizacion');
    if (!fechaFinalizacionColumn) {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\` 
        ADD COLUMN \`fechaFinalizacion\` DATETIME NULL AFTER \`fechaNovedad\`;
      `);
    }

    // Agregar observacionesTecnico si no existe
    const observacionesTecnicoColumn = instalacionesTable?.findColumnByName('observacionesTecnico');
    if (!observacionesTecnicoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\` 
        ADD COLUMN \`observacionesTecnico\` TEXT NULL AFTER \`instalacionObservaciones\`;
      `);
    }

    // Agregar estadoInstalacionId si no existe
    const estadoInstalacionIdColumn = instalacionesTable?.findColumnByName('estadoInstalacionId');
    if (!estadoInstalacionIdColumn) {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\` 
        ADD COLUMN \`estadoInstalacionId\` INT NULL AFTER \`estado\`;
      `);
    }

    // Agregar bodegaId si no existe
    const bodegaIdInstalacionColumn = instalacionesTable?.findColumnByName('bodegaId');
    if (!bodegaIdInstalacionColumn) {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\` 
        ADD COLUMN \`bodegaId\` INT NULL AFTER \`usuarioRegistra\`;
      `);
    }

    // Actualizar enum de estado para incluir todos los valores necesarios
    try {
      const estadoColumn = instalacionesTable?.findColumnByName('estado');
      if (estadoColumn && estadoColumn.type === 'enum') {
        // Verificar si el enum tiene todos los valores necesarios
        const enumValues = estadoColumn.enum || [];
        const requiredValues = ['pendiente', 'asignacion', 'construccion', 'certificacion', 'novedad', 'anulada', 'completada', 'en_proceso', 'finalizada', 'cancelada'];
        const missingValues = requiredValues.filter(v => !enumValues.includes(v));
        
        if (missingValues.length > 0) {
          // Actualizar el enum para incluir todos los valores
          await queryRunner.query(`
            ALTER TABLE \`instalaciones\` 
            MODIFY COLUMN \`estado\` ENUM('pendiente', 'asignacion', 'construccion', 'certificacion', 'novedad', 'anulada', 'completada', 'en_proceso', 'finalizada', 'cancelada') 
            NOT NULL DEFAULT 'pendiente';
          `);
        }
      }
    } catch (error) {
      // Ignorar si hay error al actualizar el enum
    }

    // ============================================
    // 6. MOVIMIENTOS_INVENTARIO: Agregar columnas faltantes
    // ============================================
    const movimientosTable = await queryRunner.getTable('movimientos_inventario');

    // Agregar inventarioId si no existe
    const inventarioIdMovimientoColumn = movimientosTable?.findColumnByName('inventarioId');
    if (!inventarioIdMovimientoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`movimientos_inventario\` 
        ADD COLUMN \`inventarioId\` INT NULL AFTER \`proveedorId\`;
      `);
      
      // Crear índice si no existe
      try {
        await queryRunner.query(`
          CREATE INDEX \`idx_movimientos_inventarioId\` 
          ON \`movimientos_inventario\` (\`inventarioId\`);
        `);
      } catch (error) {
        // Ignorar si ya existe el índice
      }
    }

    // Agregar movimientoCodigo si no existe
    const movimientoCodigoColumn = movimientosTable?.findColumnByName('movimientoCodigo');
    if (!movimientoCodigoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`movimientos_inventario\` 
        ADD COLUMN \`movimientoCodigo\` VARCHAR(100) NULL AFTER \`inventarioId\`;
      `);
      
      // Crear índice si no existe
      try {
        await queryRunner.query(`
          CREATE INDEX \`idx_movimientos_movimientoCodigo\` 
          ON \`movimientos_inventario\` (\`movimientoCodigo\`);
        `);
      } catch (error) {
        // Ignorar si ya existe el índice
      }
    }

    // Agregar identificadorUnico si no existe
    const identificadorUnicoMovimientoColumn = movimientosTable?.findColumnByName('identificadorUnico');
    if (!identificadorUnicoMovimientoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`movimientos_inventario\` 
        ADD COLUMN \`identificadorUnico\` VARCHAR(50) NULL UNIQUE AFTER \`movimientoCodigo\`;
      `);
      
      // Crear índice único si no existe
      try {
        await queryRunner.query(`
          CREATE UNIQUE INDEX \`idx_movimientos_identificador_unico\` 
          ON \`movimientos_inventario\` (\`identificadorUnico\`);
        `);
      } catch (error) {
        // Ignorar si ya existe el índice
      }
    }

    // Agregar estadoMovimientoId si no existe
    const estadoMovimientoIdColumn = movimientosTable?.findColumnByName('estadoMovimientoId');
    if (!estadoMovimientoIdColumn) {
      await queryRunner.query(`
        ALTER TABLE \`movimientos_inventario\` 
        ADD COLUMN \`estadoMovimientoId\` INT NULL AFTER \`movimientoEstado\`;
      `);
    }

    // Agregar origenTipo si no existe
    const origenTipoColumn = movimientosTable?.findColumnByName('origenTipo');
    if (!origenTipoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`movimientos_inventario\` 
        ADD COLUMN \`origenTipo\` ENUM('bodega', 'tecnico') NULL AFTER \`estadoMovimientoId\`;
      `);
    }

    // Agregar tecnicoOrigenId si no existe
    const tecnicoOrigenIdColumn = movimientosTable?.findColumnByName('tecnicoOrigenId');
    if (!tecnicoOrigenIdColumn) {
      await queryRunner.query(`
        ALTER TABLE \`movimientos_inventario\` 
        ADD COLUMN \`tecnicoOrigenId\` INT NULL AFTER \`origenTipo\`;
      `);
      
      // Crear índice si no existe
      try {
        await queryRunner.query(`
          CREATE INDEX \`idx_movimientos_tecnico_origen\` 
          ON \`movimientos_inventario\` (\`tecnicoOrigenId\`);
        `);
      } catch (error) {
        // Ignorar si ya existe el índice
      }
    }

    // Agregar numerosMedidor si no existe
    const numerosMedidorMovimientoColumn = movimientosTable?.findColumnByName('numerosMedidor');
    if (!numerosMedidorMovimientoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`movimientos_inventario\` 
        ADD COLUMN \`numerosMedidor\` JSON NULL AFTER \`tecnicoOrigenId\`;
      `);
    }

    // ============================================
    // 7. TRASLADOS: Agregar columnas faltantes
    // ============================================
    const trasladosTable = await queryRunner.getTable('traslados');

    // Agregar trasladoCodigo si no existe
    const trasladoCodigoColumn = trasladosTable?.findColumnByName('trasladoCodigo');
    if (!trasladoCodigoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`traslados\` 
        ADD COLUMN \`trasladoCodigo\` VARCHAR(100) NULL AFTER \`trasladoObservaciones\`;
      `);
    }

    // Agregar identificadorUnico si no existe
    const identificadorUnicoTrasladoColumn = trasladosTable?.findColumnByName('identificadorUnico');
    if (!identificadorUnicoTrasladoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`traslados\` 
        ADD COLUMN \`identificadorUnico\` VARCHAR(50) NULL UNIQUE AFTER \`trasladoCodigo\`;
      `);
      
      // Crear índice único si no existe
      try {
        await queryRunner.query(`
          CREATE UNIQUE INDEX \`idx_traslados_identificador_unico\` 
          ON \`traslados\` (\`identificadorUnico\`);
        `);
      } catch (error) {
        // Ignorar si ya existe el índice
      }
    }

    // Agregar estadoTrasladoId si no existe
    const estadoTrasladoIdColumn = trasladosTable?.findColumnByName('estadoTrasladoId');
    if (!estadoTrasladoIdColumn) {
      await queryRunner.query(`
        ALTER TABLE \`traslados\` 
        ADD COLUMN \`estadoTrasladoId\` INT NULL AFTER \`trasladoEstado\`;
      `);
    }

    // Agregar numerosMedidor si no existe
    const numerosMedidorTrasladoColumn = trasladosTable?.findColumnByName('numerosMedidor');
    if (!numerosMedidorTrasladoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`traslados\` 
        ADD COLUMN \`numerosMedidor\` JSON NULL AFTER \`identificadorUnico\`;
      `);
    }

    // ============================================
    // 8. CLIENTES: Agregar columnas faltantes
    // ============================================
    const clientesTable = await queryRunner.getTable('clientes');

    // Agregar clienteBarrio si no existe
    const clienteBarrioColumn = clientesTable?.findColumnByName('clienteBarrio');
    if (!clienteBarrioColumn) {
      await queryRunner.query(`
        ALTER TABLE \`clientes\` 
        ADD COLUMN \`clienteBarrio\` VARCHAR(255) NULL AFTER \`clienteDireccion\`;
      `);
    }

    // Agregar clienteEstado si no existe (ENUM)
    const clienteEstadoColumn = clientesTable?.findColumnByName('clienteEstado');
    if (!clienteEstadoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`clientes\` 
        ADD COLUMN \`clienteEstado\` ENUM('activo', 'instalacion_asignada', 'realizando_instalacion') 
        NOT NULL DEFAULT 'activo' AFTER \`cantidadInstalaciones\`;
      `);
    }

    // Agregar estadoClienteId si no existe
    const estadoClienteIdColumn = clientesTable?.findColumnByName('estadoClienteId');
    
    if (!estadoClienteIdColumn) {
      // Agregar después de clienteEstado (que ahora debería existir)
      await queryRunner.query(`
        ALTER TABLE \`clientes\` 
        ADD COLUMN \`estadoClienteId\` INT NULL AFTER \`clienteEstado\`;
      `);
    }

    // Verificar si nombreUsuario existe, si no, podría ser clienteNombreCompleto (legacy)
    const nombreUsuarioColumn = clientesTable?.findColumnByName('nombreUsuario');
    const clienteNombreCompletoColumn = clientesTable?.findColumnByName('clienteNombreCompleto');
    
    if (!nombreUsuarioColumn) {
      if (clienteNombreCompletoColumn) {
        // Renombrar clienteNombreCompleto a nombreUsuario
        try {
          await queryRunner.query(`
            ALTER TABLE \`clientes\` 
            CHANGE COLUMN \`clienteNombreCompleto\` \`nombreUsuario\` VARCHAR(255) NOT NULL;
          `);
        } catch (error) {
          // Si falla el rename, agregar la columna y migrar datos
          await queryRunner.query(`
            ALTER TABLE \`clientes\` 
            ADD COLUMN \`nombreUsuario\` VARCHAR(255) NOT NULL AFTER \`clienteId\`;
          `);
          try {
            await queryRunner.query(`
              UPDATE \`clientes\` 
              SET \`nombreUsuario\` = \`clienteNombreCompleto\` 
              WHERE \`nombreUsuario\` IS NULL OR \`nombreUsuario\` = '';
            `);
          } catch (error) {
            // Ignorar si hay error
          }
        }
      } else {
        // Si no existe ninguna, agregar nombreUsuario
        await queryRunner.query(`
          ALTER TABLE \`clientes\` 
          ADD COLUMN \`nombreUsuario\` VARCHAR(255) NOT NULL AFTER \`clienteId\`;
        `);
      }
    }

    // ============================================
    // 9. PROYECTOS: Agregar usuarioRegistra si no existe
    // ============================================
    const proyectosTable = await queryRunner.getTable('proyectos');
    const usuarioRegistraProyectoColumn = proyectosTable?.findColumnByName('usuarioRegistra');
    
    if (!usuarioRegistraProyectoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`proyectos\` 
        ADD COLUMN \`usuarioRegistra\` INT NULL AFTER \`proyectoEstado\`;
      `);
    }

    // ============================================
    // 10. ITEMS_PROYECTO: Agregar itemNombre e itemCodigo si no existen
    // ============================================
    const itemsProyectoTable = await queryRunner.getTable('items_proyecto');
    const itemNombreColumn = itemsProyectoTable?.findColumnByName('itemNombre');
    const itemCodigoColumn = itemsProyectoTable?.findColumnByName('itemCodigo');
    
    if (!itemNombreColumn) {
      await queryRunner.query(`
        ALTER TABLE \`items_proyecto\` 
        ADD COLUMN \`itemNombre\` VARCHAR(255) NOT NULL DEFAULT '' AFTER \`proyectoId\`;
      `);
    }
    
    if (!itemCodigoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`items_proyecto\` 
        ADD COLUMN \`itemCodigo\` VARCHAR(255) NULL AFTER \`itemNombre\`;
      `);
    }

    // ============================================
    // 11. ITEMS_PROYECTO: Agregar usuarioRegistra si no existe
    // ============================================
    const usuarioRegistraItemColumn = itemsProyectoTable?.findColumnByName('usuarioRegistra');
    
    if (!usuarioRegistraItemColumn) {
      await queryRunner.query(`
        ALTER TABLE \`items_proyecto\` 
        ADD COLUMN \`usuarioRegistra\` INT NULL AFTER \`itemEstado\`;
      `);
    }

    // ============================================
    // 12. CLASIFICACIONES: Crear tabla si no existe
    // ============================================
    const clasificacionesTable = await queryRunner.getTable('clasificaciones');
    if (!clasificacionesTable) {
      await queryRunner.query(`
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    }

    // ============================================
    // 13. ASIGNACIONES_TECNICOS: Crear tabla si no existe
    // ============================================
    const asignacionesTecnicosTable = await queryRunner.getTable('asignaciones_tecnicos');
    if (!asignacionesTecnicosTable) {
      await queryRunner.query(`
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // Agregar foreign keys
      try {
        await queryRunner.query(`
          ALTER TABLE \`asignaciones_tecnicos\` 
          ADD CONSTRAINT \`FK_asignaciones_tecnicos_usuario\` 
          FOREIGN KEY (\`usuarioId\`) 
          REFERENCES \`usuarios\`(\`usuarioId\`) 
          ON DELETE CASCADE;
        `);
      } catch (error) {
        console.warn('No se pudo agregar FK a usuarios:', error);
      }

      try {
        await queryRunner.query(`
          ALTER TABLE \`asignaciones_tecnicos\` 
          ADD CONSTRAINT \`FK_asignaciones_tecnicos_inventario\` 
          FOREIGN KEY (\`inventarioId\`) 
          REFERENCES \`inventarios\`(\`inventarioId\`) 
          ON DELETE CASCADE;
        `);
      } catch (error) {
        console.warn('No se pudo agregar FK a inventarios:', error);
      }

      try {
        await queryRunner.query(`
          ALTER TABLE \`asignaciones_tecnicos\` 
          ADD CONSTRAINT \`FK_asignaciones_tecnicos_asignador\` 
          FOREIGN KEY (\`usuarioAsignadorId\`) 
          REFERENCES \`usuarios\`(\`usuarioId\`) 
          ON DELETE CASCADE;
        `);
      } catch (error) {
        console.warn('No se pudo agregar FK a usuarioAsignador:', error);
      }
    }

    // ============================================
    // 14. INVENTARIO_TECNICOS: Crear tabla si no existe
    // ============================================
    const inventarioTecnicosTable = await queryRunner.getTable('inventario_tecnicos');
    if (!inventarioTecnicosTable) {
      await queryRunner.query(`
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // Agregar foreign keys
      try {
        await queryRunner.query(`
          ALTER TABLE \`inventario_tecnicos\` 
          ADD CONSTRAINT \`FK_inventario_tecnicos_usuario\` 
          FOREIGN KEY (\`usuarioId\`) 
          REFERENCES \`usuarios\`(\`usuarioId\`) 
          ON DELETE CASCADE;
        `);
      } catch (error) {
        console.warn('No se pudo agregar FK a usuarios:', error);
      }

      try {
        await queryRunner.query(`
          ALTER TABLE \`inventario_tecnicos\` 
          ADD CONSTRAINT \`FK_inventario_tecnicos_material\` 
          FOREIGN KEY (\`materialId\`) 
          REFERENCES \`materiales\`(\`materialId\`) 
          ON DELETE CASCADE;
        `);
      } catch (error) {
        console.warn('No se pudo agregar FK a materiales:', error);
      }
    }

    // ============================================
    // 15. INSTALACIONES_MATERIALES: Crear tabla si no existe
    // ============================================
    const instalacionesMaterialesTable = await queryRunner.getTable('instalaciones_materiales');
    if (!instalacionesMaterialesTable) {
      await queryRunner.query(`
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // Agregar foreign keys
      try {
        await queryRunner.query(`
          ALTER TABLE \`instalaciones_materiales\` 
          ADD CONSTRAINT \`FK_instalaciones_materiales_instalacion\` 
          FOREIGN KEY (\`instalacionId\`) 
          REFERENCES \`instalaciones\`(\`instalacionId\`) 
          ON DELETE CASCADE;
        `);
      } catch (error) {
        console.warn('No se pudo agregar FK a instalaciones:', error);
      }

      try {
        await queryRunner.query(`
          ALTER TABLE \`instalaciones_materiales\` 
          ADD CONSTRAINT \`FK_instalaciones_materiales_material\` 
          FOREIGN KEY (\`materialId\`) 
          REFERENCES \`materiales\`(\`materialId\`) 
          ON DELETE CASCADE;
        `);
      } catch (error) {
        console.warn('No se pudo agregar FK a materiales:', error);
      }
    }

    // ============================================
    // 16. NUMEROS_MEDIDOR: Crear tabla si no existe
    // ============================================
    const numerosMedidorTable = await queryRunner.getTable('numeros_medidor');
    if (!numerosMedidorTable) {
      await queryRunner.query(`
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // Agregar foreign keys si las tablas referenciadas existen
      try {
        await queryRunner.query(`
          ALTER TABLE \`numeros_medidor\` 
          ADD CONSTRAINT \`FK_numeros_medidor_material\` 
          FOREIGN KEY (\`materialId\`) 
          REFERENCES \`materiales\`(\`materialId\`) 
          ON DELETE CASCADE;
        `);
      } catch (error) {
        console.warn('No se pudo agregar FK a materiales:', error);
      }

      try {
        await queryRunner.query(`
          ALTER TABLE \`numeros_medidor\` 
          ADD CONSTRAINT \`FK_numeros_medidor_usuario\` 
          FOREIGN KEY (\`usuarioId\`) 
          REFERENCES \`usuarios\`(\`usuarioId\`) 
          ON DELETE SET NULL;
        `);
      } catch (error) {
        console.warn('No se pudo agregar FK a usuarios:', error);
      }

      // Verificar si existe inventario_tecnicos antes de agregar FK
      const inventarioTecnicosTable = await queryRunner.getTable('inventario_tecnicos');
      if (inventarioTecnicosTable) {
        try {
          await queryRunner.query(`
            ALTER TABLE \`numeros_medidor\` 
            ADD CONSTRAINT \`FK_numeros_medidor_inventario_tecnico\` 
            FOREIGN KEY (\`inventarioTecnicoId\`) 
            REFERENCES \`inventario_tecnicos\`(\`inventarioTecnicoId\`) 
            ON DELETE SET NULL;
          `);
        } catch (error) {
          console.warn('No se pudo agregar FK a inventario_tecnicos:', error);
        }
      }

      // Verificar si existe instalaciones_materiales antes de agregar FK
      const instalacionesMaterialesTable = await queryRunner.getTable('instalaciones_materiales');
      if (instalacionesMaterialesTable) {
        try {
          await queryRunner.query(`
            ALTER TABLE \`numeros_medidor\` 
            ADD CONSTRAINT \`FK_numeros_medidor_instalacion_material\` 
            FOREIGN KEY (\`instalacionMaterialId\`) 
            REFERENCES \`instalaciones_materiales\`(\`instalacionMaterialId\`) 
            ON DELETE SET NULL;
          `);
        } catch (error) {
          console.warn('No se pudo agregar FK a instalaciones_materiales:', error);
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir cambios en orden inverso
    
    const bodegasTable = await queryRunner.getTable('bodegas');
    
    // Eliminar bodegaTipo
    const bodegaTipoColumn = bodegasTable?.findColumnByName('bodegaTipo');
    if (bodegaTipoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`bodegas\` 
        DROP COLUMN \`bodegaTipo\`;
      `);
    }

    // Eliminar bodegaFoto
    const bodegaFotoColumn = bodegasTable?.findColumnByName('bodegaFoto');
    if (bodegaFotoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`bodegas\` 
        DROP COLUMN \`bodegaFoto\`;
      `);
    }

    // Eliminar bodegaCorreo
    const bodegaCorreoColumn = bodegasTable?.findColumnByName('bodegaCorreo');
    if (bodegaCorreoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`bodegas\` 
        DROP COLUMN \`bodegaCorreo\`;
      `);
    }

    // Eliminar bodegaTelefono
    const bodegaTelefonoColumn = bodegasTable?.findColumnByName('bodegaTelefono');
    if (bodegaTelefonoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`bodegas\` 
        DROP COLUMN \`bodegaTelefono\`;
      `);
    }

    const sedesTable = await queryRunner.getTable('sedes');
    
    // Eliminar sedeFoto
    const sedeFotoColumn = sedesTable?.findColumnByName('sedeFoto');
    if (sedeFotoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`sedes\` 
        DROP COLUMN \`sedeFoto\`;
      `);
    }

    // Eliminar sedeCorreo
    const sedeCorreoColumn = sedesTable?.findColumnByName('sedeCorreo');
    if (sedeCorreoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`sedes\` 
        DROP COLUMN \`sedeCorreo\`;
      `);
    }

    const usuariosTable = await queryRunner.getTable('usuarios');
    
    // Eliminar usuarioFoto
    const usuarioFotoColumn = usuariosTable?.findColumnByName('usuarioFoto');
    if (usuarioFotoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`usuarios\` 
        DROP COLUMN \`usuarioFoto\`;
      `);
    }

    const instalacionesTable = await queryRunner.getTable('instalaciones');
    
    // Eliminar bodegaId
    const bodegaIdInstalacionColumn = instalacionesTable?.findColumnByName('bodegaId');
    if (bodegaIdInstalacionColumn) {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\` 
        DROP COLUMN \`bodegaId\`;
      `);
    }

    // Eliminar estadoInstalacionId
    const estadoInstalacionIdColumn = instalacionesTable?.findColumnByName('estadoInstalacionId');
    if (estadoInstalacionIdColumn) {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\` 
        DROP COLUMN \`estadoInstalacionId\`;
      `);
    }

    // Eliminar observacionesTecnico
    const observacionesTecnicoColumn = instalacionesTable?.findColumnByName('observacionesTecnico');
    if (observacionesTecnicoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\` 
        DROP COLUMN \`observacionesTecnico\`;
      `);
    }

    // Eliminar fechaFinalizacion
    const fechaFinalizacionColumn = instalacionesTable?.findColumnByName('fechaFinalizacion');
    if (fechaFinalizacionColumn) {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\` 
        DROP COLUMN \`fechaFinalizacion\`;
      `);
    }

    // Eliminar fechaNovedad
    const fechaNovedadColumn = instalacionesTable?.findColumnByName('fechaNovedad');
    if (fechaNovedadColumn) {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\` 
        DROP COLUMN \`fechaNovedad\`;
      `);
    }

    // Eliminar fechaAnulacion
    const fechaAnulacionColumn = instalacionesTable?.findColumnByName('fechaAnulacion');
    if (fechaAnulacionColumn) {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\` 
        DROP COLUMN \`fechaAnulacion\`;
      `);
    }

    // Eliminar fechaCertificacion
    const fechaCertificacionColumn = instalacionesTable?.findColumnByName('fechaCertificacion');
    if (fechaCertificacionColumn) {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\` 
        DROP COLUMN \`fechaCertificacion\`;
      `);
    }

    // Eliminar fechaConstruccion
    const fechaConstruccionColumn = instalacionesTable?.findColumnByName('fechaConstruccion');
    if (fechaConstruccionColumn) {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\` 
        DROP COLUMN \`fechaConstruccion\`;
      `);
    }

    // Eliminar fechaAsignacion
    const fechaAsignacionColumn = instalacionesTable?.findColumnByName('fechaAsignacion');
    if (fechaAsignacionColumn) {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\` 
        DROP COLUMN \`fechaAsignacion\`;
      `);
    }

    // Eliminar fechaAsignacionMetrogas
    const fechaAsignacionMetrogasColumn = instalacionesTable?.findColumnByName('fechaAsignacionMetrogas');
    if (fechaAsignacionMetrogasColumn) {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\` 
        DROP COLUMN \`fechaAsignacionMetrogas\`;
      `);
    }

    // Eliminar instalacionFecha
    const instalacionFechaColumn = instalacionesTable?.findColumnByName('instalacionFecha');
    if (instalacionFechaColumn) {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\` 
        DROP COLUMN \`instalacionFecha\`;
      `);
    }

    // Eliminar instalacionSelloRegulador
    const instalacionSelloReguladorColumn = instalacionesTable?.findColumnByName('instalacionSelloRegulador');
    if (instalacionSelloReguladorColumn) {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\` 
        DROP COLUMN \`instalacionSelloRegulador\`;
      `);
    }

    // Eliminar identificadorUnico
    const identificadorUnicoColumn = instalacionesTable?.findColumnByName('identificadorUnico');
    if (identificadorUnicoColumn) {
      try {
        await queryRunner.query(`
          DROP INDEX \`idx_instalaciones_identificador_unico\` ON \`instalaciones\`;
        `);
      } catch (error) {
        // Ignorar si no existe el índice
      }
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\` 
        DROP COLUMN \`identificadorUnico\`;
      `);
    }

    const materialesTable = await queryRunner.getTable('materiales');
    
    // Eliminar materialEsMedidor
    const materialEsMedidorColumn = materialesTable?.findColumnByName('materialEsMedidor');
    if (materialEsMedidorColumn) {
      await queryRunner.query(`
        ALTER TABLE \`materiales\` 
        DROP COLUMN \`materialEsMedidor\`;
      `);
    }

    // Eliminar unidadMedidaId y su foreign key
    const unidadMedidaIdColumn = materialesTable?.findColumnByName('unidadMedidaId');
    if (unidadMedidaIdColumn) {
      try {
        await queryRunner.query(`
          ALTER TABLE \`materiales\` 
          DROP FOREIGN KEY \`FK_material_unidad_medida\`;
        `);
      } catch (error) {
        // Ignorar si no existe la FK
      }
      await queryRunner.query(`
        ALTER TABLE \`materiales\` 
        DROP COLUMN \`unidadMedidaId\`;
      `);
    }

    // Eliminar tabla unidades_medida si existe
    const unidadesMedidaTable = await queryRunner.getTable('unidades_medida');
    if (unidadesMedidaTable) {
      await queryRunner.query(`
        DROP TABLE IF EXISTS \`unidades_medida\`;
      `);
    }

    const clientesTable = await queryRunner.getTable('clientes');
    
    // Eliminar estadoClienteId
    const estadoClienteIdColumn = clientesTable?.findColumnByName('estadoClienteId');
    if (estadoClienteIdColumn) {
      await queryRunner.query(`
        ALTER TABLE \`clientes\` 
        DROP COLUMN \`estadoClienteId\`;
      `);
    }

    // Eliminar clienteBarrio
    const clienteBarrioColumn = clientesTable?.findColumnByName('clienteBarrio');
    if (clienteBarrioColumn) {
      await queryRunner.query(`
        ALTER TABLE \`clientes\` 
        DROP COLUMN \`clienteBarrio\`;
      `);
    }

    const trasladosTable = await queryRunner.getTable('traslados');
    
    // Eliminar numerosMedidor
    const numerosMedidorTrasladoColumn = trasladosTable?.findColumnByName('numerosMedidor');
    if (numerosMedidorTrasladoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`traslados\` 
        DROP COLUMN \`numerosMedidor\`;
      `);
    }

    // Eliminar estadoTrasladoId
    const estadoTrasladoIdColumn = trasladosTable?.findColumnByName('estadoTrasladoId');
    if (estadoTrasladoIdColumn) {
      await queryRunner.query(`
        ALTER TABLE \`traslados\` 
        DROP COLUMN \`estadoTrasladoId\`;
      `);
    }

    // Eliminar identificadorUnico
    const identificadorUnicoTrasladoColumn = trasladosTable?.findColumnByName('identificadorUnico');
    if (identificadorUnicoTrasladoColumn) {
      try {
        await queryRunner.query(`
          DROP INDEX \`idx_traslados_identificador_unico\` ON \`traslados\`;
        `);
      } catch (error) {
        // Ignorar si no existe el índice
      }
      await queryRunner.query(`
        ALTER TABLE \`traslados\` 
        DROP COLUMN \`identificadorUnico\`;
      `);
    }

    // Eliminar trasladoCodigo
    const trasladoCodigoColumn = trasladosTable?.findColumnByName('trasladoCodigo');
    if (trasladoCodigoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`traslados\` 
        DROP COLUMN \`trasladoCodigo\`;
      `);
    }

    const movimientosTable = await queryRunner.getTable('movimientos_inventario');
    
    // Eliminar numerosMedidor
    const numerosMedidorMovimientoColumn = movimientosTable?.findColumnByName('numerosMedidor');
    if (numerosMedidorMovimientoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`movimientos_inventario\` 
        DROP COLUMN \`numerosMedidor\`;
      `);
    }

    // Eliminar tecnicoOrigenId
    const tecnicoOrigenIdColumn = movimientosTable?.findColumnByName('tecnicoOrigenId');
    if (tecnicoOrigenIdColumn) {
      try {
        await queryRunner.query(`
          DROP INDEX \`idx_movimientos_tecnico_origen\` ON \`movimientos_inventario\`;
        `);
      } catch (error) {
        // Ignorar si no existe el índice
      }
      await queryRunner.query(`
        ALTER TABLE \`movimientos_inventario\` 
        DROP COLUMN \`tecnicoOrigenId\`;
      `);
    }

    // Eliminar origenTipo
    const origenTipoColumn = movimientosTable?.findColumnByName('origenTipo');
    if (origenTipoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`movimientos_inventario\` 
        DROP COLUMN \`origenTipo\`;
      `);
    }

    // Eliminar estadoMovimientoId
    const estadoMovimientoIdColumn = movimientosTable?.findColumnByName('estadoMovimientoId');
    if (estadoMovimientoIdColumn) {
      await queryRunner.query(`
        ALTER TABLE \`movimientos_inventario\` 
        DROP COLUMN \`estadoMovimientoId\`;
      `);
    }

    // Eliminar identificadorUnico
    const identificadorUnicoMovimientoColumn = movimientosTable?.findColumnByName('identificadorUnico');
    if (identificadorUnicoMovimientoColumn) {
      try {
        await queryRunner.query(`
          DROP INDEX \`idx_movimientos_identificador_unico\` ON \`movimientos_inventario\`;
        `);
      } catch (error) {
        // Ignorar si no existe el índice
      }
      await queryRunner.query(`
        ALTER TABLE \`movimientos_inventario\` 
        DROP COLUMN \`identificadorUnico\`;
      `);
    }

    // Eliminar movimientoCodigo
    const movimientoCodigoColumn = movimientosTable?.findColumnByName('movimientoCodigo');
    if (movimientoCodigoColumn) {
      try {
        await queryRunner.query(`
          DROP INDEX \`idx_movimientos_movimientoCodigo\` ON \`movimientos_inventario\`;
        `);
      } catch (error) {
        // Ignorar si no existe el índice
      }
      await queryRunner.query(`
        ALTER TABLE \`movimientos_inventario\` 
        DROP COLUMN \`movimientoCodigo\`;
      `);
    }

    // Eliminar inventarioId
    const inventarioIdMovimientoColumn = movimientosTable?.findColumnByName('inventarioId');
    if (inventarioIdMovimientoColumn) {
      try {
        await queryRunner.query(`
          DROP INDEX \`idx_movimientos_inventarioId\` ON \`movimientos_inventario\`;
        `);
      } catch (error) {
        // Ignorar si no existe el índice
      }
      await queryRunner.query(`
        ALTER TABLE \`movimientos_inventario\` 
        DROP COLUMN \`inventarioId\`;
      `);
    }
  }
}
