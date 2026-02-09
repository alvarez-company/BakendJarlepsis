import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cambia el valor por defecto de asignacionEstado en asignaciones_tecnicos
 * de 'pendiente' a 'aprobada'. El material asignado en una asignación queda
 * en estado aprobado por defecto (ya no pendiente por aprobación).
 */
export class AsignacionEstadoDefaultAprobada1769790900000 implements MigrationInterface {
  name = 'AsignacionEstadoDefaultAprobada1769790900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`asignaciones_tecnicos\`
      MODIFY COLUMN \`asignacionEstado\` ENUM('pendiente', 'aprobada', 'rechazada') NOT NULL DEFAULT 'aprobada';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`asignaciones_tecnicos\`
      MODIFY COLUMN \`asignacionEstado\` ENUM('pendiente', 'aprobada', 'rechazada') NOT NULL DEFAULT 'pendiente';
    `);
  }
}
