import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Estado "anulada" queda unificado en "dev" (devuelta).
 * Añade tipo de notificación instalacion_devuelta.
 */
export class AnuladaADevYNotificacionDevuelta1773100000000 implements MigrationInterface {
  name = 'AnuladaADevYNotificacionDevuelta1773100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const notif = await queryRunner.getTable('notificaciones');
    if (notif?.findColumnByName('tipoNotificacion')) {
      await queryRunner.query(`
        ALTER TABLE \`notificaciones\`
        MODIFY COLUMN \`tipoNotificacion\` ENUM(
          'mensaje_nuevo',
          'reaccion_mensaje',
          'instalacion_completada',
          'instalacion_asignada',
          'instalacion_en_proceso',
          'instalacion_cancelada',
          'instalacion_asignacion',
          'instalacion_construccion',
          'instalacion_certificacion',
          'instalacion_novedad',
          'instalacion_anulada',
          'instalacion_devuelta',
          'mensaje_respondido',
          'usuario_ingreso_grupo',
          'usuario_salio_grupo',
          'materiales_asignados'
        ) NOT NULL
      `);
    }

    const inst = await queryRunner.getTable('instalaciones');
    if (inst) {
      await queryRunner.query(`
        UPDATE \`instalaciones\`
        SET \`fechaDevolucion\` = COALESCE(\`fechaDevolucion\`, \`fechaAnulacion\`, NOW(6))
        WHERE LOWER(TRIM(\`estado\`)) IN ('anulada', 'cancelada')
      `);
      await queryRunner.query(`
        UPDATE \`instalaciones\` SET \`estado\` = 'dev'
        WHERE LOWER(TRIM(\`estado\`)) IN ('anulada', 'cancelada')
      `);
      await queryRunner.query(`
        UPDATE \`instalaciones\` i
        INNER JOIN \`estados_instalacion\` e ON e.\`estadoCodigo\` = 'dev'
        SET i.\`estadoInstalacionId\` = e.\`estadoInstalacionId\`
        WHERE i.\`estado\` = 'dev'
      `);
    }

    const est = await queryRunner.getTable('estados_instalacion');
    if (est) {
      await queryRunner.query(`
        UPDATE \`estados_instalacion\` SET \`activo\` = 0 WHERE \`estadoCodigo\` = 'anulada'
      `);
    }
  }

  public async down(): Promise<void> {
    // Irreversible sin perder datos: las filas ya quedaron como dev.
  }
}
