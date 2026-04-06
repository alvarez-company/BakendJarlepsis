import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProyectosRedesYActividades1771000000000 implements MigrationInterface {
  name = 'ProyectosRedesYActividades1771000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`proyectos_redes\` (
        \`proyectoRedesId\` INT NOT NULL AUTO_INCREMENT,
        \`codigo\` VARCHAR(24) NOT NULL,
        \`nombre\` VARCHAR(160) NOT NULL,
        \`activo\` TINYINT(1) NOT NULL DEFAULT 1,
        \`fechaCreacion\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`fechaActualizacion\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`proyectoRedesId\`),
        UNIQUE KEY \`UQ_proyectos_redes_codigo\` (\`codigo\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`proyectos_redes_actividades\` (
        \`actividadId\` INT NOT NULL AUTO_INCREMENT,
        \`proyectoRedesId\` INT NOT NULL,
        \`nombre\` VARCHAR(255) NOT NULL,
        \`orden\` INT NOT NULL DEFAULT 0,
        \`activo\` TINYINT(1) NOT NULL DEFAULT 1,
        \`usuarioRegistra\` INT NULL,
        \`fechaCreacion\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`fechaActualizacion\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`actividadId\`),
        KEY \`IDX_proyectos_redes_actividades_proyecto\` (\`proyectoRedesId\`),
        CONSTRAINT \`FK_proyectos_redes_actividades_proyecto\`
          FOREIGN KEY (\`proyectoRedesId\`) REFERENCES \`proyectos_redes\` (\`proyectoRedesId\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO \`proyectos_redes\` (\`codigo\`, \`nombre\`, \`activo\`)
      VALUES
        ('inversion', 'Inversión', 1),
        ('mantenimiento', 'Mantenimiento', 1);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `proyectos_redes_actividades`');
    await queryRunner.query('DROP TABLE IF EXISTS `proyectos_redes`');
  }
}
