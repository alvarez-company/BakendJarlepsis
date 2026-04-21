import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureCentroOperativoInventarios1776000000000 implements MigrationInterface {
  name = 'EnsureCentroOperativoInventarios1776000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Crear bodega tipo 'centro' por sede si no existe
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
        oficinaId,
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
        0 AS oficinaId,
        s.sedeId AS sedeId,
        CURRENT_TIMESTAMP AS fechaCreacion,
        CURRENT_TIMESTAMP AS fechaActualizacion
      FROM sedes s
      WHERE NOT EXISTS (
        SELECT 1 FROM bodegas b
        WHERE b.sedeId = s.sedeId AND LOWER(COALESCE(b.bodegaTipo,'')) = 'centro'
      )
    `);

    // 2) Crear inventario activo para esa bodega si no existe
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
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No revertimos: estas bodegas/inventarios son infraestructura requerida.
  }
}

