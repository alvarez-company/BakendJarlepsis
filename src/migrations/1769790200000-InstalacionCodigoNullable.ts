import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hace opcional el código de instalación (instalacionCodigo).
 * En instalaciones de redes no siempre hay código; permite guardar sin código.
 */
export class InstalacionCodigoNullable1769790200000 implements MigrationInterface {
  name = 'InstalacionCodigoNullable1769790200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`instalaciones\`
      MODIFY COLUMN \`instalacionCodigo\` VARCHAR(255) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`instalaciones\`
      MODIFY COLUMN \`instalacionCodigo\` VARCHAR(255) NOT NULL
    `);
  }
}
