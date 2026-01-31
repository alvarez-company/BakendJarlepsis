import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crea la tabla estados_instalacion y sus datos iniciales.
 * Requerida porque la entidad Instalacion tiene relación ManyToOne con EstadoInstalacionEntity.
 */
export class CreateEstadosInstalacion1769790300000 implements MigrationInterface {
  name = 'CreateEstadosInstalacion1769790300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`estados_instalacion\` (
        \`estadoInstalacionId\` INT NOT NULL AUTO_INCREMENT,
        \`estadoCodigo\` VARCHAR(50) NOT NULL,
        \`estadoNombre\` VARCHAR(100) NOT NULL,
        \`estadoDescripcion\` TEXT NULL,
        \`activo\` TINYINT NOT NULL DEFAULT 1,
        \`fechaCreacion\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`fechaActualizacion\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`estadoInstalacionId\`),
        UNIQUE INDEX \`IDX_estadoCodigo\` (\`estadoCodigo\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const count = await queryRunner.query(
      `SELECT COUNT(*) AS c FROM \`estados_instalacion\``
    );
    const hasRows = Number(count?.[0]?.c ?? 0) > 0;
    if (!hasRows) {
      await queryRunner.query(`
        INSERT INTO \`estados_instalacion\` (\`estadoCodigo\`, \`estadoNombre\`, \`estadoDescripcion\`) VALUES
        ('pendiente', 'Pendiente', 'Instalación pendiente de asignación'),
        ('asignacion', 'Asignación', 'Instalación asignada a técnico'),
        ('en_proceso', 'En Proceso', 'Instalación en proceso'),
        ('construccion', 'Construcción', 'Instalación en construcción'),
        ('certificacion', 'Certificación', 'Instalación en certificación'),
        ('completada', 'Completada', 'Instalación completada'),
        ('finalizada', 'Finalizada', 'Instalación finalizada'),
        ('novedad', 'Novedad', 'Instalación con novedad técnica'),
        ('cancelada', 'Cancelada', 'Instalación cancelada'),
        ('anulada', 'Anulada', 'Instalación anulada')
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`estados_instalacion\``);
  }
}
