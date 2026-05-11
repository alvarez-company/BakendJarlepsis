import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNumeroOrdenToMovimientosTrasladosAsignaciones1774000000000 implements MigrationInterface {
  name = 'AddNumeroOrdenToMovimientosTrasladosAsignaciones1774000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE movimientos_inventario ADD COLUMN numeroOrden VARCHAR(120) NULL AFTER movimientoCodigo`,
    );
    await queryRunner.query(
      `ALTER TABLE traslados ADD COLUMN numeroOrden VARCHAR(120) NULL AFTER trasladoCodigo`,
    );
    await queryRunner.query(
      `ALTER TABLE asignaciones_tecnicos ADD COLUMN numeroOrden VARCHAR(120) NULL AFTER asignacionCodigo`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE asignaciones_tecnicos DROP COLUMN numeroOrden`);
    await queryRunner.query(`ALTER TABLE traslados DROP COLUMN numeroOrden`);
    await queryRunner.query(`ALTER TABLE movimientos_inventario DROP COLUMN numeroOrden`);
  }
}
