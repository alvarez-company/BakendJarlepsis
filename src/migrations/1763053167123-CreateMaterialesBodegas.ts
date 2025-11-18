import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMaterialesBodegas1763053167123 implements MigrationInterface {
  name = 'CreateMaterialesBodegas1763053167123';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`materiales_bodegas\` (
        \`materialBodegaId\` INT NOT NULL AUTO_INCREMENT,
        \`materialId\` INT NOT NULL,
        \`bodegaId\` INT NOT NULL,
        \`stock\` DECIMAL(10, 2) NOT NULL DEFAULT 0,
        \`precioPromedio\` DECIMAL(10, 2) NULL,
        \`fechaCreacion\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`fechaActualizacion\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`materialBodegaId\`),
        UNIQUE KEY \`UQ_materiales_bodegas_material_bodega\` (\`materialId\`, \`bodegaId\`),
        KEY \`IDX_materiales_bodegas_material\` (\`materialId\`),
        KEY \`IDX_materiales_bodegas_bodega\` (\`bodegaId\`),
        CONSTRAINT \`FK_materiales_bodegas_material\` FOREIGN KEY (\`materialId\`) REFERENCES \`materiales\`(\`materialId\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_materiales_bodegas_bodega\` FOREIGN KEY (\`bodegaId\`) REFERENCES \`bodegas\`(\`bodegaId\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      INSERT INTO \`materiales_bodegas\` (\`materialId\`, \`bodegaId\`, \`stock\`, \`precioPromedio\`, \`fechaCreacion\`, \`fechaActualizacion\`)
      SELECT
        m.\`materialId\`,
        inv.\`bodegaId\`,
        m.\`materialStock\`,
        m.\`materialPrecio\`,
        NOW(6),
        NOW(6)
      FROM \`materiales\` m
      INNER JOIN \`inventarios\` inv ON inv.\`inventarioId\` = m.\`inventarioId\`
      LEFT JOIN \`materiales_bodegas\` mb
        ON mb.\`materialId\` = m.\`materialId\` AND mb.\`bodegaId\` = inv.\`bodegaId\`
      WHERE inv.\`bodegaId\` IS NOT NULL
        AND mb.\`materialBodegaId\` IS NULL;
    `);

    await queryRunner.query(`
      UPDATE \`materiales\` m
      SET m.\`materialStock\` = (
        SELECT IFNULL(SUM(mb.\`stock\`), 0)
        FROM \`materiales_bodegas\` mb
        WHERE mb.\`materialId\` = m.\`materialId\`
      )
      WHERE EXISTS (
        SELECT 1
        FROM \`materiales_bodegas\` mb
        WHERE mb.\`materialId\` = m.\`materialId\`
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `materiales_bodegas`');
  }
}

