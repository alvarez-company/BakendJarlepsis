import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Unifica el rol "Administrador - Centro Operativo" (administrador) con "Administrador" (admin).
 * - Asigna a todos los usuarios con rol administrador el rol admin.
 * - Elimina el rol administrador de la tabla roles.
 */
export class MergeAdministradorIntoAdmin1769789600000 implements MigrationInterface {
  name = 'MergeAdministradorIntoAdmin1769789600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Obtener rolId de admin
    const adminRows = await queryRunner.query(
      `SELECT rolId FROM roles WHERE rolTipo = 'admin' LIMIT 1`,
    );
    if (!adminRows || adminRows.length === 0) {
      return; // No hay rol admin, nada que hacer
    }
    const adminRolId = adminRows[0].rolId;

    // Asignar rol admin a todos los usuarios que tenían rol administrador
    await queryRunner.query(
      `UPDATE usuarios u
       INNER JOIN roles r ON u.usuarioRolId = r.rolId
       SET u.usuarioRolId = ?
       WHERE r.rolTipo = 'administrador'`,
      [adminRolId],
    );

    // Eliminar el rol "Administrador - Centro Operativo"
    await queryRunner.query(`DELETE FROM roles WHERE rolTipo = 'administrador'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recrear el rol administrador (por si se necesita rollback)
    await queryRunner.query(`
      INSERT INTO roles (rolNombre, rolTipo, rolDescripcion, rolEstado, fechaCreacion, fechaActualizacion)
      SELECT 'Administrador - Centro Operativo', 'administrador', 'Usuario con acceso de solo lectura a la información del centro operativo.', 1, NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM roles WHERE rolTipo = 'administrador')
    `);
    // Nota: no se revierten los usuarioRolId porque no sabemos cuáles eran administrador
  }
}
