import { MigrationInterface, QueryRunner } from 'typeorm';

/** PDF de anexo administrativo (solo sistema web), opcional en cualquier estado. */
export class AddAnexoPdfToInstalaciones1777100000000 implements MigrationInterface {
  name = 'AddAnexoPdfToInstalaciones1777100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('instalaciones');
    const has = table?.columns.some((c) => c.name === 'anexoPdf');
    if (!has) {
      await queryRunner.query(
        `ALTER TABLE \`instalaciones\` ADD COLUMN \`anexoPdf\` VARCHAR(512) NULL AFTER \`instalacionAnexos\``,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`instalaciones\` DROP COLUMN \`anexoPdf\``);
  }
}
