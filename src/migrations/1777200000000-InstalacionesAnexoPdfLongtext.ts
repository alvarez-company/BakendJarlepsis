import { MigrationInterface, QueryRunner } from 'typeorm';

export class InstalacionesAnexoPdfLongtext1777200000000 implements MigrationInterface {
  name = 'InstalacionesAnexoPdfLongtext1777200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `instalaciones` MODIFY `anexoPdf` LONGTEXT NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `instalaciones` MODIFY `anexoPdf` VARCHAR(512) NULL');
  }
}
