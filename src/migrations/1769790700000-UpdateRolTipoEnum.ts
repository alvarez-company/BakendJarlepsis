import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Actualiza el enum de rolTipo en roles para incluir todos los roles nuevos:
 * - gerencia (ya agregado en migración anterior, pero se asegura)
 * - soldador
 * - admin-internas
 * - admin-redes
 * - almacenista
 * - bodega-internas
 * - bodega-redes
 */
export class UpdateRolTipoEnum1769790700000 implements MigrationInterface {
  name = 'UpdateRolTipoEnum1769790700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Actualizar el enum para incluir todos los valores necesarios
    await queryRunner.query(`
      ALTER TABLE \`roles\` 
      MODIFY COLUMN \`rolTipo\` ENUM(
        'superadmin',
        'gerencia',
        'admin',
        'admin-internas',
        'admin-redes',
        'tecnico',
        'soldador',
        'almacenista',
        'bodega-internas',
        'bodega-redes',
        'empleado',
        'bodega',
        'inventario',
        'traslados',
        'devoluciones',
        'salidas',
        'entradas',
        'instalaciones'
      ) NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir al enum original (sin los nuevos valores)
    await queryRunner.query(`
      ALTER TABLE \`roles\` 
      MODIFY COLUMN \`rolTipo\` ENUM(
        'superadmin',
        'admin',
        'tecnico',
        'empleado',
        'bodega',
        'inventario',
        'traslados',
        'devoluciones',
        'salidas',
        'entradas',
        'instalaciones'
      ) NOT NULL;
    `);
  }
}
