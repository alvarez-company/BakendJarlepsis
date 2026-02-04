import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Actualiza el enum de tipoNotificacion en notificaciones para incluir los nuevos tipos:
 * - instalacion_asignacion
 * - instalacion_construccion
 * - instalacion_certificacion
 * - instalacion_novedad
 * - instalacion_anulada
 * - materiales_asignados
 */
export class UpdateTipoNotificacionEnum1769790600000 implements MigrationInterface {
  name = 'UpdateTipoNotificacionEnum1769790600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Actualizar el enum para incluir todos los valores nuevos
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
        'mensaje_respondido',
        'usuario_ingreso_grupo',
        'usuario_salio_grupo',
        'materiales_asignados'
      ) NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir al enum original (sin los nuevos valores)
    await queryRunner.query(`
      ALTER TABLE \`notificaciones\` 
      MODIFY COLUMN \`tipoNotificacion\` ENUM(
        'mensaje_nuevo',
        'reaccion_mensaje',
        'instalacion_completada',
        'instalacion_asignada',
        'instalacion_en_proceso',
        'instalacion_cancelada',
        'mensaje_respondido',
        'usuario_ingreso_grupo',
        'usuario_salio_grupo'
      ) NOT NULL;
    `);
  }
}
