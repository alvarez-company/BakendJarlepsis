import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey, TableColumn } from 'typeorm';

export class CreateNovedadesSistema1780000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('requerimientos', [
      new TableColumn({
        name: 'publicarCambio',
        type: 'tinyint',
        default: 0,
      }),
      new TableColumn({
        name: 'cambioPublicado',
        type: 'tinyint',
        default: 0,
      }),
    ]);

    await queryRunner.createTable(
      new Table({
        name: 'novedades_sistema',
        columns: [
          {
            name: 'novedadId',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
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
            enum: ['nueva_funcionalidad', 'mejora', 'correccion', 'actualizacion', 'anuncio'],
            default: "'actualizacion'",
          },
          {
            name: 'requerimientoId',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'publicadoPorId',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'cambiosDetallados',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'version',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'activa',
            type: 'tinyint',
            default: 1,
          },
          {
            name: 'destacada',
            type: 'tinyint',
            default: 0,
          },
          {
            name: 'fechaPublicacion',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'novedades_sistema',
      new TableIndex({
        name: 'IDX_novedades_fecha_publicacion',
        columnNames: ['fechaPublicacion'],
      }),
    );

    await queryRunner.createIndex(
      'novedades_sistema',
      new TableIndex({
        name: 'IDX_novedades_activa_fecha',
        columnNames: ['activa', 'fechaPublicacion'],
      }),
    );

    await queryRunner.createForeignKey(
      'novedades_sistema',
      new TableForeignKey({
        columnNames: ['requerimientoId'],
        referencedColumnNames: ['requerimientoId'],
        referencedTableName: 'requerimientos',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'novedades_sistema',
      new TableForeignKey({
        columnNames: ['publicadoPorId'],
        referencedColumnNames: ['usuarioId'],
        referencedTableName: 'usuarios',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('novedades_sistema');
    if (table) {
      const foreignKeys = table.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('novedades_sistema', fk);
      }
    }
    await queryRunner.dropTable('novedades_sistema', true);

    await queryRunner.dropColumns('requerimientos', ['publicarCambio', 'cambioPublicado']);
  }
}
