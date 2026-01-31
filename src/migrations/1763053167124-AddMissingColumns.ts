import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración para agregar columnas faltantes críticas:
 * - unidadMedidaId en materiales
 * - identificadorUnico en instalaciones
 * - clienteEstado en clientes
 *
 * Esta migración es una versión simplificada y enfocada de las columnas críticas
 * que están causando errores en el sistema.
 */
export class AddMissingColumns1763053167124 implements MigrationInterface {
  name = 'AddMissingColumns1763053167124';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. CREAR TABLA unidades_medida SI NO EXISTE
    // ============================================
    const unidadesMedidaTable = await queryRunner.getTable('unidades_medida');
    if (!unidadesMedidaTable) {
      await queryRunner.query(`
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

    // ============================================
    // 2. AGREGAR unidadMedidaId A MATERIALES
    // ============================================
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
        console.warn('No se pudo asignar unidad por defecto:', error);
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
        console.warn('No se pudo agregar foreign key:', error);
      }
    }

    // ============================================
    // 3. AGREGAR identificadorUnico A INSTALACIONES
    // ============================================
    const instalacionesTable = await queryRunner.getTable('instalaciones');
    const identificadorUnicoColumn = instalacionesTable?.findColumnByName('identificadorUnico');

    if (!identificadorUnicoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\` 
        ADD COLUMN \`identificadorUnico\` VARCHAR(50) NULL AFTER \`instalacionCodigo\`;
      `);

      // Crear índice único si no existe
      try {
        await queryRunner.query(`
          CREATE UNIQUE INDEX \`idx_instalaciones_identificador_unico\` 
          ON \`instalaciones\` (\`identificadorUnico\`);
        `);
      } catch (error) {
        // Ignorar si ya existe el índice
        console.warn('No se pudo crear índice único:', error);
      }
    }

    // ============================================
    // 4. AGREGAR clienteEstado A CLIENTES
    // ============================================
    const clientesTable = await queryRunner.getTable('clientes');
    const clienteEstadoColumn = clientesTable?.findColumnByName('clienteEstado');

    if (!clienteEstadoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`clientes\` 
        ADD COLUMN \`clienteEstado\` ENUM('activo', 'instalacion_asignada', 'realizando_instalacion') 
        NOT NULL DEFAULT 'activo' AFTER \`cantidadInstalaciones\`;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar identificadorUnico de instalaciones
    const instalacionesTable = await queryRunner.getTable('instalaciones');
    const identificadorUnicoColumn = instalacionesTable?.findColumnByName('identificadorUnico');

    if (identificadorUnicoColumn) {
      // Eliminar índice primero
      try {
        await queryRunner.query(`
          DROP INDEX \`idx_instalaciones_identificador_unico\` ON \`instalaciones\`;
        `);
      } catch (error) {
        // Ignorar si no existe
      }

      await queryRunner.query(`
        ALTER TABLE \`instalaciones\` 
        DROP COLUMN \`identificadorUnico\`;
      `);
    }

    // Eliminar unidadMedidaId de materiales
    const materialesTable = await queryRunner.getTable('materiales');
    const unidadMedidaIdColumn = materialesTable?.findColumnByName('unidadMedidaId');

    if (unidadMedidaIdColumn) {
      // Eliminar foreign key primero
      try {
        await queryRunner.query(`
          ALTER TABLE \`materiales\` 
          DROP FOREIGN KEY \`FK_material_unidad_medida\`;
        `);
      } catch (error) {
        // Ignorar si no existe
      }

      await queryRunner.query(`
        ALTER TABLE \`materiales\` 
        DROP COLUMN \`unidadMedidaId\`;
      `);
    }

    // Eliminar clienteEstado de clientes
    const clientesTable = await queryRunner.getTable('clientes');
    const clienteEstadoColumn = clientesTable?.findColumnByName('clienteEstado');

    if (clienteEstadoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`clientes\` 
        DROP COLUMN \`clienteEstado\`;
      `);
    }

    // No eliminamos la tabla unidades_medida porque puede tener datos importantes
  }
}
