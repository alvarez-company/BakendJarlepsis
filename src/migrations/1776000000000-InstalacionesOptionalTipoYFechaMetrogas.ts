import { MigrationInterface, QueryRunner } from 'typeorm';

export class InstalacionesOptionalTipoYFechaMetrogas1776000000000 implements MigrationInterface {
  name = 'InstalacionesOptionalTipoYFechaMetrogas1776000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Permitir null en tipoInstalacionId
    await queryRunner.query(`
      ALTER TABLE \`instalaciones\`
      MODIFY COLUMN \`tipoInstalacionId\` INT NULL
    `);

    // Permitir null en fechaAsignacionMetrogas
    await queryRunner.query(`
      ALTER TABLE \`instalaciones\`
      MODIFY COLUMN \`fechaAsignacionMetrogas\` DATE NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Intentar revertir a NOT NULL (puede fallar si existen nulos)
    await queryRunner.query(`
      ALTER TABLE \`instalaciones\`
      MODIFY COLUMN \`fechaAsignacionMetrogas\` DATE NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`instalaciones\`
      MODIFY COLUMN \`tipoInstalacionId\` INT NOT NULL
    `);
  }
}
