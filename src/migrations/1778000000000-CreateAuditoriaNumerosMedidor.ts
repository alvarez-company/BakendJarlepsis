import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateAuditoriaNumerosMedidor1778000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'auditoria_numeros_medidor',
        columns: [
          {
            name: 'auditoriaId',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'numeroMedidorId',
            type: 'int',
          },
          {
            name: 'materialId',
            type: 'int',
          },
          {
            name: 'numeroAnterior',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'numeroNuevo',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'usuarioId',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'usuarioNombre',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'usuarioCorreo',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'motivo',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'fechaCambio',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Foreign key a numeros_medidor
    await queryRunner.createForeignKey(
      'auditoria_numeros_medidor',
      new TableForeignKey({
        columnNames: ['numeroMedidorId'],
        referencedColumnNames: ['numeroMedidorId'],
        referencedTableName: 'numeros_medidor',
        onDelete: 'CASCADE',
      }),
    );

    // Foreign key a materiales
    await queryRunner.createForeignKey(
      'auditoria_numeros_medidor',
      new TableForeignKey({
        columnNames: ['materialId'],
        referencedColumnNames: ['materialId'],
        referencedTableName: 'materiales',
        onDelete: 'CASCADE',
      }),
    );

    // Foreign key a usuarios (opcional)
    await queryRunner.createForeignKey(
      'auditoria_numeros_medidor',
      new TableForeignKey({
        columnNames: ['usuarioId'],
        referencedColumnNames: ['usuarioId'],
        referencedTableName: 'usuarios',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('auditoria_numeros_medidor');
    if (table) {
      const foreignKeys = table.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('auditoria_numeros_medidor', fk);
      }
    }
    await queryRunner.dropTable('auditoria_numeros_medidor', true);
  }
}
