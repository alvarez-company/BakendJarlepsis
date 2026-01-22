import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsuarioFotoToUsuarios1761918287308
  implements MigrationInterface
{
  name = 'AddUsuarioFotoToUsuarios1761918287308';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar si la columna usuarioFoto ya existe
    const usuariosTable = await queryRunner.getTable('usuarios');
    const usuarioFotoColumn = usuariosTable?.findColumnByName('usuarioFoto');

    if (!usuarioFotoColumn) {
      // Agregar columna usuarioFoto a la tabla usuarios
      await queryRunner.query(`
        ALTER TABLE \`usuarios\` 
        ADD COLUMN \`usuarioFoto\` LONGTEXT NULL AFTER \`usuarioCreador\`;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Verificar si la columna usuarioFoto existe antes de eliminarla
    const usuariosTable = await queryRunner.getTable('usuarios');
    const usuarioFotoColumn = usuariosTable?.findColumnByName('usuarioFoto');

    if (usuarioFotoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`usuarios\` 
        DROP COLUMN \`usuarioFoto\`;
      `);
    }
  }
}
