import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Añade instalacionAnexos a instalaciones.
 * Almacena las URLs de fotos/archivos subidos en el chat de la instalación (anexos).
 */
export class AddInstalacionAnexos1769790500000 implements MigrationInterface {
  name = 'AddInstalacionAnexos1769790500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('instalaciones');
    const hasAnexos = table?.columns.some((c) => c.name === 'instalacionAnexos');
    if (!hasAnexos) {
      await queryRunner.query(
        `ALTER TABLE \`instalaciones\` ADD COLUMN \`instalacionAnexos\` JSON NULL AFTER \`observacionesTecnico\``,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`instalaciones\` DROP COLUMN \`instalacionAnexos\``);
  }
}
