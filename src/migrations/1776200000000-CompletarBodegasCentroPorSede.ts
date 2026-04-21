import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Idempotente: asegura 1 bodega `bodegaTipo = 'centro'` por cada sede y su inventario activo.
 * Corrige entornos donde la migración anterior referenciaba `oficinaId` (columna ya no existe).
 */
export class CompletarBodegasCentroPorSede1776200000000 implements MigrationInterface {
  name = 'CompletarBodegasCentroPorSede1776200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');

    await queryRunner.query(`
      INSERT INTO bodegas (
        bodegaNombre,
        bodegaDescripcion,
        bodegaUbicacion,
        bodegaTelefono,
        bodegaCorreo,
        bodegaFoto,
        bodegaEstado,
        bodegaTipo,
        sedeId,
        fechaCreacion,
        fechaActualizacion
      )
      SELECT
        'Bodega centro operativo' AS bodegaNombre,
        'Stock del centro operativo (no asignado a bodegas específicas)' AS bodegaDescripcion,
        NULL AS bodegaUbicacion,
        NULL AS bodegaTelefono,
        NULL AS bodegaCorreo,
        NULL AS bodegaFoto,
        1 AS bodegaEstado,
        'centro' AS bodegaTipo,
        s.sedeId AS sedeId,
        CURRENT_TIMESTAMP AS fechaCreacion,
        CURRENT_TIMESTAMP AS fechaActualizacion
      FROM sedes s
      WHERE NOT EXISTS (
        SELECT 1 FROM bodegas b
        WHERE b.sedeId = s.sedeId AND LOWER(COALESCE(b.bodegaTipo,'')) = 'centro'
      )
    `);

    await queryRunner.query(`
      INSERT INTO inventarios (
        inventarioNombre,
        inventarioDescripcion,
        bodegaId,
        inventarioEstado
      )
      SELECT
        CONCAT('Inventario - Centro Operativo ', COALESCE(s.sedeNombre, s.sedeId)) AS inventarioNombre,
        'Inventario del centro operativo (bodega tipo centro)' AS inventarioDescripcion,
        b.bodegaId AS bodegaId,
        1 AS inventarioEstado
      FROM bodegas b
      INNER JOIN sedes s ON s.sedeId = b.sedeId
      WHERE LOWER(COALESCE(b.bodegaTipo,'')) = 'centro'
        AND NOT EXISTS (
          SELECT 1 FROM inventarios i
          WHERE i.bodegaId = b.bodegaId AND i.inventarioEstado = 1
        )
    `);

    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No revertimos: infraestructura requerida por sede.
  }
}
