import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Añade la columna instalacionTipo ('internas' | 'redes') a instalaciones
 * para identificar si una instalación es de internas o de redes.
 * El administrador de centro elige al crear; admin-internas solo crea internas; admin-redes solo redes.
 */
export class AddInstalacionTipo1769790100000 implements MigrationInterface {
  name = 'AddInstalacionTipo1769790100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`instalaciones\`
      ADD COLUMN \`instalacionTipo\` VARCHAR(20) NULL
      COMMENT 'internas | redes'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`instalaciones\` DROP COLUMN \`instalacionTipo\``,
    );
  }
}
