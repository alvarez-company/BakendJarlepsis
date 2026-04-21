import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Resetea datos operativos para arranque productivo:
 * - Mantiene: usuarios, sedes/centros operativos, bodegas, materiales, catálogos.
 * - Limpia: instalaciones y su uso de materiales/usuarios, movimientos (entrada/salida/devolución),
 *   traslados, asignaciones a técnicos, inventario técnico, auditoría inventario, notificaciones y chat de instalaciones.
 * - Deja stocks en 0 (materiales/materiales_bodegas) y elimina numeros de medidor (numeros_medidor).
 *
 * NOTA: esta migración es destructiva, pero implementa rollback usando tablas de backup.
 */
export class ResetInventarioParaProduccion1775000000000 implements MigrationInterface {
  name = 'ResetInventarioParaProduccion1775000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Asegurar que truncates/updates no fallen por FKs en MySQL
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');

    // Backup interno (para rollback). Se crean tablas con sufijo fijo y se copian datos.
    // Si ya existen (por una ejecución previa), se limpian y se vuelven a llenar.
    const backups: Array<{ src: string; bak: string }> = [
      { src: 'movimientos_inventario', bak: '__bak_1775000000000_movimientos_inventario' },
      { src: 'traslados', bak: '__bak_1775000000000_traslados' },
      { src: 'asignaciones_tecnicos', bak: '__bak_1775000000000_asignaciones_tecnicos' },
      { src: 'inventario_tecnicos', bak: '__bak_1775000000000_inventario_tecnicos' },
      { src: 'auditoria_inventario', bak: '__bak_1775000000000_auditoria_inventario' },
      { src: 'instalaciones_materiales', bak: '__bak_1775000000000_instalaciones_materiales' },
      { src: 'instalaciones_usuarios', bak: '__bak_1775000000000_instalaciones_usuarios' },
      { src: 'instalaciones', bak: '__bak_1775000000000_instalaciones' },
      { src: 'usuarios_grupos', bak: '__bak_1775000000000_usuarios_grupos' },
      { src: 'grupos', bak: '__bak_1775000000000_grupos' },
      { src: 'mensajes', bak: '__bak_1775000000000_mensajes' },
      { src: 'reacciones_mensaje', bak: '__bak_1775000000000_reacciones_mensaje' },
      { src: 'notificaciones', bak: '__bak_1775000000000_notificaciones' },
      { src: 'numeros_medidor', bak: '__bak_1775000000000_numeros_medidor' },
    ];

    for (const { src, bak } of backups) {
      await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`${bak}\` LIKE \`${src}\``);
      await queryRunner.query(`TRUNCATE TABLE \`${bak}\``);
      await queryRunner.query(`INSERT INTO \`${bak}\` SELECT * FROM \`${src}\``);
    }

    // Backup de stocks (solo columnas necesarias) para rollback sin tocar catálogo.
    await queryRunner.query(
      'CREATE TABLE IF NOT EXISTS `__bak_1775000000000_materiales_stock` (`materialId` int NOT NULL PRIMARY KEY, `materialStock` decimal(10,2) NOT NULL) ENGINE=InnoDB',
    );
    await queryRunner.query('TRUNCATE TABLE `__bak_1775000000000_materiales_stock`');
    await queryRunner.query(
      'INSERT INTO `__bak_1775000000000_materiales_stock` (`materialId`, `materialStock`) SELECT `materialId`, `materialStock` FROM `materiales`',
    );

    await queryRunner.query(
      'CREATE TABLE IF NOT EXISTS `__bak_1775000000000_materiales_bodegas_stock` (`materialBodegaId` int NOT NULL PRIMARY KEY, `stock` decimal(10,2) NOT NULL) ENGINE=InnoDB',
    );
    await queryRunner.query('TRUNCATE TABLE `__bak_1775000000000_materiales_bodegas_stock`');
    await queryRunner.query(
      'INSERT INTO `__bak_1775000000000_materiales_bodegas_stock` (`materialBodegaId`, `stock`) SELECT `materialBodegaId`, `stock` FROM `materiales_bodegas`',
    );

    // 1) Limpiar data operativa de inventario
    await queryRunner.query('TRUNCATE TABLE `movimientos_inventario`');
    await queryRunner.query('TRUNCATE TABLE `traslados`');
    await queryRunner.query('TRUNCATE TABLE `asignaciones_tecnicos`');
    await queryRunner.query('TRUNCATE TABLE `inventario_tecnicos`');
    await queryRunner.query('TRUNCATE TABLE `auditoria_inventario`');

    // 2) Limpiar instalaciones (quedan en blanco)
    await queryRunner.query('TRUNCATE TABLE `instalaciones_materiales`');
    await queryRunner.query('TRUNCATE TABLE `instalaciones_usuarios`');
    await queryRunner.query('TRUNCATE TABLE `instalaciones`');

    // 3) Limpiar chat asociado a instalaciones (solo grupos tipo instalacion)
    // Primero borrar vínculos de usuarios a grupos de instalación
    await queryRunner.query(`
      DELETE ug
      FROM \`usuarios_grupos\` ug
      INNER JOIN \`grupos\` g ON g.grupoId = ug.grupoId
      WHERE g.tipoGrupo = 'instalacion'
    `);
    // Borrar mensajes/reacciones del chat (histórico operativo)
    await queryRunner.query('TRUNCATE TABLE `reacciones_mensaje`');
    await queryRunner.query('TRUNCATE TABLE `mensajes`');
    // Borrar los grupos de instalación
    await queryRunner.query(`DELETE FROM \`grupos\` WHERE tipoGrupo = 'instalacion'`);

    // 4) Limpiar notificaciones (incluye chat e instalaciones)
    await queryRunner.query('TRUNCATE TABLE `notificaciones`');

    // 5) Reset stocks a 0 (manteniendo el catálogo de materiales)
    await queryRunner.query('UPDATE `materiales` SET `materialStock` = 0');
    // Mantener precios (precioPromedio) tal cual; solo stock en cero
    await queryRunner.query('UPDATE `materiales_bodegas` SET `stock` = 0');

    // 6) Medidores: eliminar todos (quedan en cero)
    await queryRunner.query('TRUNCATE TABLE `numeros_medidor`');

    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback desde backups creados en up()
    // Orden importa por FKs: primero tablas dependientes, luego padres.
    const disableFK = async (qr: QueryRunner) => qr.query('SET FOREIGN_KEY_CHECKS = 0');
    const enableFK = async (qr: QueryRunner) => qr.query('SET FOREIGN_KEY_CHECKS = 1');

    const restorePairs: Array<{ src: string; bak: string }> = [
      // Padres primero (aunque FK checks estén apagados, mantenemos orden lógico)
      { src: 'grupos', bak: '__bak_1775000000000_grupos' },
      { src: 'usuarios_grupos', bak: '__bak_1775000000000_usuarios_grupos' },
      { src: 'instalaciones', bak: '__bak_1775000000000_instalaciones' },
      { src: 'instalaciones_materiales', bak: '__bak_1775000000000_instalaciones_materiales' },
      { src: 'instalaciones_usuarios', bak: '__bak_1775000000000_instalaciones_usuarios' },
      { src: 'numeros_medidor', bak: '__bak_1775000000000_numeros_medidor' },
      { src: 'mensajes', bak: '__bak_1775000000000_mensajes' },
      { src: 'reacciones_mensaje', bak: '__bak_1775000000000_reacciones_mensaje' },
      { src: 'notificaciones', bak: '__bak_1775000000000_notificaciones' },
      { src: 'inventario_tecnicos', bak: '__bak_1775000000000_inventario_tecnicos' },
      { src: 'asignaciones_tecnicos', bak: '__bak_1775000000000_asignaciones_tecnicos' },
      { src: 'movimientos_inventario', bak: '__bak_1775000000000_movimientos_inventario' },
      { src: 'traslados', bak: '__bak_1775000000000_traslados' },
      { src: 'auditoria_inventario', bak: '__bak_1775000000000_auditoria_inventario' },
    ];

    await disableFK(queryRunner);

    // Restaurar tablas truncadas/borradas
    for (const { src, bak } of restorePairs) {
      await queryRunner.query(`TRUNCATE TABLE \`${src}\``);
      await queryRunner.query(`INSERT INTO \`${src}\` SELECT * FROM \`${bak}\``);
    }

    // Restaurar stocks sin tocar precios/catálogo
    await queryRunner.query(`
      UPDATE \`materiales\` m
      INNER JOIN \`__bak_1775000000000_materiales_stock\` b ON b.materialId = m.materialId
      SET m.materialStock = b.materialStock
    `);

    await queryRunner.query(`
      UPDATE \`materiales_bodegas\` mb
      INNER JOIN \`__bak_1775000000000_materiales_bodegas_stock\` b ON b.materialBodegaId = mb.materialBodegaId
      SET mb.stock = b.stock
    `);

    await enableFK(queryRunner);
  }
}

