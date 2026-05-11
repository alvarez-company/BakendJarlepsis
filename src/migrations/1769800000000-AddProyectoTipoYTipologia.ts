import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProyectoTipoYTipologia1769800000000 implements MigrationInterface {
  name = 'AddProyectoTipoYTipologia1769800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const cols: Array<{ name: string; ddl: string }> = [
      {
        name: 'proyectoTipo',
        ddl: 'ALTER TABLE `proyectos` ADD COLUMN `proyectoTipo` VARCHAR(20) NULL',
      },
      {
        name: 'proyectoTipologiaTerreno',
        ddl: 'ALTER TABLE `proyectos` ADD COLUMN `proyectoTipologiaTerreno` VARCHAR(10) NULL',
      },
    ];

    for (const col of cols) {
      const exists = await queryRunner.query(
        `SELECT 1
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'proyectos'
           AND COLUMN_NAME = ?
         LIMIT 1`,
        [col.name],
      );
      const has = Array.isArray(exists) && exists.length > 0;
      if (!has) {
        await queryRunner.query(col.ddl);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir de forma segura (solo si existen)
    const cols = ['proyectoTipologiaTerreno', 'proyectoTipo'];
    for (const col of cols) {
      const exists = await queryRunner.query(
        `SELECT 1
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'proyectos'
           AND COLUMN_NAME = ?
         LIMIT 1`,
        [col],
      );
      const has = Array.isArray(exists) && exists.length > 0;
      if (has) {
        await queryRunner.query(`ALTER TABLE \`proyectos\` DROP COLUMN \`${col}\``);
      }
    }
  }
}
