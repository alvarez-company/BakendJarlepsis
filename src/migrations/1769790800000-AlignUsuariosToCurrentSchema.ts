import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Alinea la tabla usuarios con el esquema actual de la entidad User.
 * - Añade tipoDocumentoId si no existe (nullable, FK a tipos_documentos_identidad si la tabla existe).
 * - Añade usuarioFoto si no existe.
 * - Elimina usuarioOficina si aún existe (columna obsoleta).
 * - Asegura que usuarios existentes tengan usuarioEstado = 1 donde sea NULL.
 */
export class AlignUsuariosToCurrentSchema1769790800000
  implements MigrationInterface
{
  name = 'AlignUsuariosToCurrentSchema1769790800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const usuariosTable = await queryRunner.getTable('usuarios');
    if (!usuariosTable) return;

    // 1. Eliminar usuarioOficina si existe (ya no se usa en la entidad)
    const usuarioOficinaColumn = usuariosTable.findColumnByName('usuarioOficina');
    if (usuarioOficinaColumn) {
      try {
        const fkName = await queryRunner.query(
          `SELECT CONSTRAINT_NAME 
           FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
           WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME = 'usuarios'
             AND COLUMN_NAME = 'usuarioOficina'
             AND REFERENCED_TABLE_NAME IS NOT NULL
           LIMIT 1`,
        );
        if (fkName?.[0]?.CONSTRAINT_NAME) {
          await queryRunner.query(
            `ALTER TABLE \`usuarios\` DROP FOREIGN KEY \`${fkName[0].CONSTRAINT_NAME}\``,
          );
        }
      } catch {
        // ignorar si no hay FK
      }
      await queryRunner.query(
        `ALTER TABLE \`usuarios\` DROP COLUMN \`usuarioOficina\``,
      );
    }

    // 2. Añadir usuarioFoto si no existe
    const tableAfterOficina = await queryRunner.getTable('usuarios');
    const usuarioFotoColumn = tableAfterOficina?.findColumnByName('usuarioFoto');
    if (!usuarioFotoColumn) {
      await queryRunner.query(`
        ALTER TABLE \`usuarios\` 
        ADD COLUMN \`usuarioFoto\` LONGTEXT NULL AFTER \`usuarioCreador\`;
      `);
    }

    // 3. Añadir tipoDocumentoId si no existe
    const tableForTipo = await queryRunner.getTable('usuarios');
    const tipoDocumentoIdColumn =
      tableForTipo?.findColumnByName('tipoDocumentoId');
    if (!tipoDocumentoIdColumn) {
      await queryRunner.query(`
        ALTER TABLE \`usuarios\` 
        ADD COLUMN \`tipoDocumentoId\` INT NULL AFTER \`usuarioDocumento\`;
      `);

      const tiposTable = await queryRunner.getTable('tipos_documentos_identidad');
      if (tiposTable) {
        try {
          await queryRunner.query(`
            ALTER TABLE \`usuarios\` 
            ADD CONSTRAINT \`FK_usuarios_tipo_documento\` 
            FOREIGN KEY (\`tipoDocumentoId\`) 
            REFERENCES \`tipos_documentos_identidad\`(\`tipoDocumentoId\`) 
            ON DELETE SET NULL;
          `);
        } catch (err) {
          console.warn(
            'No se pudo crear FK usuarios.tipoDocumentoId -> tipos_documentos_identidad:',
            err,
          );
        }
      }
    }

    // 4. Asegurar que usuarios existentes tengan usuarioEstado válido (1 donde sea NULL)
    try {
      await queryRunner.query(`
        UPDATE \`usuarios\` SET \`usuarioEstado\` = 1 WHERE \`usuarioEstado\` IS NULL;
      `);
    } catch {
      // la columna puede ser NOT NULL con default, no hacer nada
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const usuariosTable = await queryRunner.getTable('usuarios');
    if (!usuariosTable) return;

    // Quitar FK y columna tipoDocumentoId
    const tipoDocumentoIdColumn =
      usuariosTable.findColumnByName('tipoDocumentoId');
    if (tipoDocumentoIdColumn) {
      try {
        await queryRunner.query(
          `ALTER TABLE \`usuarios\` DROP FOREIGN KEY \`FK_usuarios_tipo_documento\``,
        );
      } catch {
        // ignorar si no existe la FK
      }
      await queryRunner.query(
        `ALTER TABLE \`usuarios\` DROP COLUMN \`tipoDocumentoId\``,
      );
    }

    // No restauramos usuarioOficina ni eliminamos usuarioFoto en down
    // para no perder datos; el rollback parcial es aceptable.
  }
}
