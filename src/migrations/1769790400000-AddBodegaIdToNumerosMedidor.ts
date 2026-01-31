import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Añade bodegaId a numeros_medidor.
 * Si no se asigna bodega al crear el número de medidor, queda en el centro operativo (bodegaId null).
 */
export class AddBodegaIdToNumerosMedidor1769790400000 implements MigrationInterface {
  name = 'AddBodegaIdToNumerosMedidor1769790400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('numeros_medidor');
    const hasBodegaId = table?.columns.some((c) => c.name === 'bodegaId');
    if (!hasBodegaId) {
      await queryRunner.query(`ALTER TABLE \`numeros_medidor\` ADD COLUMN \`bodegaId\` INT NULL`);
      await queryRunner.query(`CREATE INDEX \`IDX_numeros_medidor_bodega\` ON \`numeros_medidor\` (\`bodegaId\`)`);
      await queryRunner.query(`
        ALTER TABLE \`numeros_medidor\`
        ADD CONSTRAINT \`FK_numeros_medidor_bodega\`
        FOREIGN KEY (\`bodegaId\`) REFERENCES \`bodegas\` (\`bodegaId\`) ON DELETE SET NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`numeros_medidor\` DROP FOREIGN KEY \`FK_numeros_medidor_bodega\``);
    await queryRunner.query(`DROP INDEX \`IDX_numeros_medidor_bodega\` ON \`numeros_medidor\``);
    await queryRunner.query(`ALTER TABLE \`numeros_medidor\` DROP COLUMN \`bodegaId\``);
  }
}
