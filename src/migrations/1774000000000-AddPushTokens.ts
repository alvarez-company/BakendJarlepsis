import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPushTokens1774000000000 implements MigrationInterface {
  name = 'AddPushTokens1774000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`push_tokens\` (
        \`pushTokenId\` int NOT NULL AUTO_INCREMENT,
        \`usuarioId\` int NOT NULL,
        \`plataforma\` varchar(32) NOT NULL DEFAULT 'web',
        \`token\` varchar(512) NOT NULL,
        \`activo\` tinyint NOT NULL DEFAULT 1,
        \`userAgent\` varchar(512) NULL,
        \`lastSeenAt\` datetime NULL,
        \`fechaCreacion\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`fechaActualizacion\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE INDEX \`IDX_push_tokens_token\` (\`token\`),
        INDEX \`IDX_push_tokens_usuarioId\` (\`usuarioId\`),
        PRIMARY KEY (\`pushTokenId\`)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `push_tokens`');
  }
}

