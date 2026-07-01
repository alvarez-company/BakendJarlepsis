import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSubmoduloToRequerimientos1781000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'requerimientos',
      new TableColumn({
        name: 'submodulo',
        type: 'enum',
        enum: [
          // Inventario
          'inv_stock',
          'inv_movimientos',
          'inv_traslados',
          'inv_materiales',
          'inv_bodegas',
          'inv_asignaciones',
          'inv_auditoria',
          // Instalaciones
          'inst_lista',
          'inst_pendientes',
          'inst_materiales',
          'inst_medidores',
          'inst_estados',
          'inst_proyectos',
          // Usuarios
          'usr_lista',
          'usr_roles',
          'usr_permisos',
          // Reportes
          'rep_general',
          'rep_exportacion',
          'rep_estadisticas',
          // Chat
          'chat_mensajes',
          'chat_grupos',
          // Medidores
          'med_lista',
          'med_asignacion',
          'med_estados',
          // General
          'general',
          'otro',
        ],
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('requerimientos', 'submodulo');
  }
}
