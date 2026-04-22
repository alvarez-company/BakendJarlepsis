import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTransferenciasTecnicos1777000000000 implements MigrationInterface {
  name = 'CreateTransferenciasTecnicos1777000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`transferencias_tecnicos\` (
        \`transferenciaTecnicoId\` INT NOT NULL AUTO_INCREMENT,
        \`codigo\` VARCHAR(64) NOT NULL,
        \`usuarioOrigenId\` INT NOT NULL,
        \`usuarioDestinoId\` INT NOT NULL,
        \`materiales\` JSON NOT NULL,
        \`numeroOrden\` VARCHAR(120) NULL,
        \`observaciones\` TEXT NULL,
        \`usuarioAsignadorId\` INT NULL,
        \`fechaCreacion\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`transferenciaTecnicoId\`),
        UNIQUE KEY \`UQ_transferencias_tecnicos_codigo\` (\`codigo\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `transferencias_tecnicos`');
  }
}

