import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Añade el rol Gerencia (mismo nivel que SuperAdmin pero sin impersonación).
 * SuperAdmin queda como rol exclusivo del desarrollador; no se lista en usuarios.
 */
export class AddGerenciaRole1769790000000 implements MigrationInterface {
  name = 'AddGerenciaRole1769790000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Añadir 'gerencia' al enum rolTipo si la columna es ENUM (MySQL)
    const table = await queryRunner.getTable('roles');
    const column = table?.findColumnByName('rolTipo');
    if (column?.type === 'enum') {
      const currentEnum = (column as any).enum || [];
      if (!currentEnum.includes('gerencia')) {
        const newEnum = [...currentEnum, 'gerencia'];
        const enumStr = newEnum.map((v: string) => `'${v}'`).join(',');
        await queryRunner.query(
          `ALTER TABLE \`roles\` MODIFY COLUMN \`rolTipo\` ENUM(${enumStr}) NOT NULL`,
        );
      }
    }

    // Insertar rol Gerencia si no existe
    await queryRunner.query(`
      INSERT INTO \`roles\` (\`rolNombre\`, \`rolTipo\`, \`rolDescripcion\`, \`rolEstado\`, \`fechaCreacion\`, \`fechaActualizacion\`)
      SELECT 'Gerencia', 'gerencia', 'Máximo nivel para la organización. Mismos permisos que SuperAdmin pero sin impersonación.', 1, NOW(), NOW()
      FROM DUAL
      WHERE NOT EXISTS (SELECT 1 FROM \`roles\` WHERE \`rolTipo\` = 'gerencia' LIMIT 1)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM \`roles\` WHERE \`rolTipo\` = 'gerencia'`);
  }
}
