import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateRequerimientos1779000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'requerimientos',
        columns: [
          {
            name: 'requerimientoId',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'codigo',
            type: 'varchar',
            length: '20',
            isUnique: true,
          },
          {
            name: 'titulo',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'descripcion',
            type: 'text',
          },
          {
            name: 'tipo',
            type: 'enum',
            enum: ['desarrollo', 'bug', 'mejora', 'consulta', 'interno_admin', 'interno_gerencia'],
            default: "'consulta'",
          },
          {
            name: 'estado',
            type: 'enum',
            enum: ['pendiente', 'en_revision', 'en_progreso', 'en_pruebas', 'completado', 'rechazado', 'cancelado'],
            default: "'pendiente'",
          },
          {
            name: 'prioridad',
            type: 'enum',
            enum: ['baja', 'media', 'alta', 'critica'],
            default: "'media'",
          },
          {
            name: 'categoria',
            type: 'enum',
            enum: ['inventario', 'instalaciones', 'usuarios', 'reportes', 'chat', 'medidores', 'general', 'otro'],
            default: "'general'",
          },
          {
            name: 'solicitanteId',
            type: 'int',
          },
          {
            name: 'asignadoId',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'sedeId',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'respuesta',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'notasInternas',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'archivosAdjuntos',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'fechaAsignacion',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'fechaResolucion',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'fechaEstimada',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'fechaCreacion',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'fechaActualizacion',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'requerimientos',
      new TableIndex({
        name: 'IDX_requerimientos_estado_prioridad',
        columnNames: ['estado', 'prioridad'],
      }),
    );

    await queryRunner.createIndex(
      'requerimientos',
      new TableIndex({
        name: 'IDX_requerimientos_solicitante_fecha',
        columnNames: ['solicitanteId', 'fechaCreacion'],
      }),
    );

    await queryRunner.createIndex(
      'requerimientos',
      new TableIndex({
        name: 'IDX_requerimientos_asignado_estado',
        columnNames: ['asignadoId', 'estado'],
      }),
    );

    await queryRunner.createIndex(
      'requerimientos',
      new TableIndex({
        name: 'IDX_requerimientos_tipo_estado',
        columnNames: ['tipo', 'estado'],
      }),
    );

    await queryRunner.createForeignKey(
      'requerimientos',
      new TableForeignKey({
        columnNames: ['solicitanteId'],
        referencedColumnNames: ['usuarioId'],
        referencedTableName: 'usuarios',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'requerimientos',
      new TableForeignKey({
        columnNames: ['asignadoId'],
        referencedColumnNames: ['usuarioId'],
        referencedTableName: 'usuarios',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'requerimientos',
      new TableForeignKey({
        columnNames: ['sedeId'],
        referencedColumnNames: ['sedeId'],
        referencedTableName: 'sedes',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('requerimientos');
    if (table) {
      const foreignKeys = table.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('requerimientos', fk);
      }
    }
    await queryRunner.dropTable('requerimientos', true);
  }
}
