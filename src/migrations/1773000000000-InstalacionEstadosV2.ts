import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Estados de instalación v2: APM, PPC, AAT, AVAN, CONS, CERT, FACT, NOVE, DEV.
 * Migra valores legacy a códigos nuevos y pasa la columna estado a VARCHAR.
 */
export class InstalacionEstadosV21773000000000 implements MigrationInterface {
  name = 'InstalacionEstadosV21773000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const instalacionesTable = await queryRunner.getTable('instalaciones');
    if (!instalacionesTable) return;

    if (!instalacionesTable.findColumnByName('instalacionNumeroActa')) {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\`
        ADD COLUMN \`instalacionNumeroActa\` VARCHAR(120) NULL AFTER \`fechaFinalizacion\`
      `);
    }
    if (!instalacionesTable.findColumnByName('observacionNovedad')) {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\`
        ADD COLUMN \`observacionNovedad\` TEXT NULL AFTER \`instalacionNumeroActa\`
      `);
    }
    if (!instalacionesTable.findColumnByName('fechaConstruida')) {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\`
        ADD COLUMN \`fechaConstruida\` DATETIME(6) NULL AFTER \`fechaConstruccion\`
      `);
    }
    if (!instalacionesTable.findColumnByName('fechaFacturacion')) {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\`
        ADD COLUMN \`fechaFacturacion\` DATETIME(6) NULL AFTER \`fechaCertificacion\`
      `);
    }
    if (!instalacionesTable.findColumnByName('fechaDevolucion')) {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\`
        ADD COLUMN \`fechaDevolucion\` DATETIME(6) NULL AFTER \`fechaFacturacion\`
      `);
    }

    const estadoCol = instalacionesTable.findColumnByName('estado');
    if (estadoCol && estadoCol.type === 'enum') {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\`
        MODIFY COLUMN \`estado\` VARCHAR(32) NOT NULL DEFAULT 'ppc'
      `);
    } else if (estadoCol && estadoCol.type !== 'varchar') {
      await queryRunner.query(`
        ALTER TABLE \`instalaciones\`
        MODIFY COLUMN \`estado\` VARCHAR(32) NOT NULL DEFAULT 'ppc'
      `);
    }

    await queryRunner.query(`
      UPDATE \`instalaciones\` SET \`estado\` = CASE LOWER(TRIM(\`estado\`))
        WHEN 'pendiente' THEN 'ppc'
        WHEN 'asignacion' THEN 'aat'
        WHEN 'construccion' THEN 'avan'
        WHEN 'certificacion' THEN 'cert'
        WHEN 'completada' THEN 'fact'
        WHEN 'novedad' THEN 'nove'
        WHEN 'anulada' THEN 'dev'
        WHEN 'en_proceso' THEN 'aat'
        WHEN 'finalizada' THEN 'fact'
        WHEN 'cancelada' THEN 'dev'
        ELSE LOWER(TRIM(\`estado\`))
      END
    `);

    await queryRunner.query(`
      INSERT INTO \`estados_instalacion\` (\`estadoCodigo\`, \`estadoNombre\`, \`estadoDescripcion\`, \`activo\`) VALUES
      ('apm', 'Asignada por Metrogas', 'Registro según asignación Metrogas', 1),
      ('ppc', 'Pendiente por construir', 'Pendiente de construcción', 1),
      ('aat', 'Asignada al técnico', 'Técnico asignado a la obra', 1),
      ('avan', 'Avance', 'Obra en ejecución', 1),
      ('cons', 'Construida', 'Obra lista / construcción terminada', 1),
      ('cert', 'Certificada', 'En o completada certificación', 1),
      ('fact', 'Facturación', 'Facturada / acta registrada', 1),
      ('nove', 'Novedad', 'Incidencia o novedad en campo', 1),
      ('dev', 'Devuelta', 'Instalación devuelta', 1)
      ON DUPLICATE KEY UPDATE
        \`estadoNombre\` = VALUES(\`estadoNombre\`),
        \`estadoDescripcion\` = VALUES(\`estadoDescripcion\`)
    `);

    await queryRunner.query(`
      UPDATE \`instalaciones\` i
      INNER JOIN \`estados_instalacion\` e ON e.\`estadoCodigo\` = i.\`estado\`
      SET i.\`estadoInstalacionId\` = e.\`estadoInstalacionId\`
    `);

    await queryRunner.query(`
      UPDATE \`instalaciones\`
      SET \`fechaFacturacion\` = \`fechaFinalizacion\`
      WHERE \`estado\` = 'fact' AND \`fechaFacturacion\` IS NULL AND \`fechaFinalizacion\` IS NOT NULL
    `);

    await queryRunner.query(`
      UPDATE \`instalaciones\`
      SET \`fechaConstruida\` = \`fechaCertificacion\`
      WHERE \`estado\` IN ('cert', 'fact') AND \`fechaConstruida\` IS NULL AND \`fechaCertificacion\` IS NOT NULL
    `);

    await queryRunner.query(`
      UPDATE \`instalaciones\`
      SET \`fechaConstruida\` = \`fechaConstruccion\`
      WHERE \`estado\` = 'avan' AND \`fechaConstruida\` IS NULL AND \`fechaConstruccion\` IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`instalaciones\` SET \`estado\` = CASE LOWER(TRIM(\`estado\`))
        WHEN 'apm' THEN 'pendiente'
        WHEN 'ppc' THEN 'pendiente'
        WHEN 'aat' THEN 'asignacion'
        WHEN 'avan' THEN 'construccion'
        WHEN 'cons' THEN 'construccion'
        WHEN 'cert' THEN 'certificacion'
        WHEN 'fact' THEN 'completada'
        WHEN 'nove' THEN 'novedad'
        WHEN 'dev' THEN 'pendiente'
        ELSE LOWER(TRIM(\`estado\`))
      END
    `);
  }
}
