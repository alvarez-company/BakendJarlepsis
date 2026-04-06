import { MigrationInterface, QueryRunner } from 'typeorm';

export class DefaultProyectoRedesV2EnInstalaciones1772000000000 implements MigrationInterface {
  name = 'DefaultProyectoRedesV2EnInstalaciones1772000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Solo aplicar si existe la columna y la tabla de tipos fijos
    const hasColumn: any[] = await queryRunner.query(`
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'instalaciones'
        AND COLUMN_NAME = 'instalacionProyectos'
      LIMIT 1
    `);
    if (!hasColumn?.length) return;

    const tipos: any[] = await queryRunner.query(
      `SELECT proyectoRedesId, codigo FROM proyectos_redes WHERE codigo = 'inversion' LIMIT 1`,
    );
    const inv = tipos?.[0];
    if (!inv?.proyectoRedesId) return;

    const payload = JSON.stringify({
      version: 'redes_v2',
      proyectoRedesId: Number(inv.proyectoRedesId),
      proyectoRedesCodigo: 'inversion',
      metrajePorTipologia: { ZV: 0, ACO: 0, CO: 0 },
      actividadIds: [],
    });

    // Poner default solo si está vacío/null y la instalación es redes (cuando la columna instalacionTipo existe)
    await queryRunner.query(
      `
      UPDATE instalaciones
      SET instalacionProyectos = ?
      WHERE LOWER(COALESCE(instalacionTipo, '')) = 'redes'
        AND (instalacionProyectos IS NULL OR instalacionProyectos = '' OR instalacionProyectos = 'null')
    `,
      [payload],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No revertimos porque podría borrar datos reales agregados luego.
  }
}

