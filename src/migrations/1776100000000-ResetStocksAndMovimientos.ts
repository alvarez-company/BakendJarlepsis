import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reseteo operativo rápido (DEV):
 * - Elimina todos los movimientos y operaciones asociadas (traslados/asignaciones/inventario técnico/auditoría).
 * - Deja en 0 el stock global y por bodega.
 * - Elimina números de medidor.
 *
 * No toca: catálogo (materiales), sedes, bodegas, usuarios.
 */
export class ResetStocksAndMovimientos1776100000000 implements MigrationInterface {
  name = 'ResetStocksAndMovimientos1776100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');

    // Eliminar operaciones
    await queryRunner.query('TRUNCATE TABLE `movimientos_inventario`');
    await queryRunner.query('TRUNCATE TABLE `traslados`');
    await queryRunner.query('TRUNCATE TABLE `asignaciones_tecnicos`');
    await queryRunner.query('TRUNCATE TABLE `inventario_tecnicos`');
    await queryRunner.query('TRUNCATE TABLE `auditoria_inventario`');

    // Stock en 0
    await queryRunner.query('UPDATE `materiales` SET `materialStock` = 0');
    await queryRunner.query('UPDATE `materiales_bodegas` SET `stock` = 0');

    // Medidores en 0
    await queryRunner.query('TRUNCATE TABLE `numeros_medidor`');

    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op: este reset no es reversible automáticamente.
  }
}
