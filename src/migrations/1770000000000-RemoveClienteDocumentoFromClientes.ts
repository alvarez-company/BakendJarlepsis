import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveClienteDocumentoFromClientes1770000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar si la tabla existe
    const tableExists = await queryRunner.hasTable('clientes');
    if (!tableExists) {
      console.log('⚠️  Tabla clientes no existe, saltando migración');
      return;
    }

    // Verificar si la columna clienteDocumento existe
    const table = await queryRunner.getTable('clientes');
    const hasClienteDocumento = table?.findColumnByName('clienteDocumento');

    if (hasClienteDocumento) {
      console.log('🔄 Eliminando índice único y columna clienteDocumento...');

      // 1. Primero, eliminar el índice único si existe
      try {
        await queryRunner.query(`DROP INDEX \`IDX_40e6ad87dd45613db7c261ac3d\` ON \`clientes\``);
        console.log(`✅ Índice único IDX_40e6ad87dd45613db7c261ac3d eliminado`);
      } catch (error: any) {
        // Si el índice no existe, continuar
        if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
          console.log('⚠️  El índice ya no existe, continuando...');
        } else {
          throw error;
        }
      }

      // 2. Luego, eliminar la columna (TypeORM manejará esto sin intentar eliminar el índice de nuevo)
      await queryRunner.query(`ALTER TABLE \`clientes\` DROP COLUMN \`clienteDocumento\``);
      console.log('✅ Columna clienteDocumento eliminada');
    } else {
      console.log('✅ La columna clienteDocumento ya no existe');
    }

    // Verificar y eliminar clienteCorreo si existe (también parece no estar en uso)
    const hasClienteCorreo = table?.findColumnByName('clienteCorreo');
    if (hasClienteCorreo) {
      await queryRunner.query(`ALTER TABLE \`clientes\` DROP COLUMN \`clienteCorreo\``);
      console.log('✅ Columna clienteCorreo eliminada');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('clientes');
    if (!table) {
      return;
    }

    // Restaurar clienteDocumento
    const hasClienteDocumento = table.findColumnByName('clienteDocumento');
    if (!hasClienteDocumento) {
      await queryRunner.addColumn(
        'clientes',
        new TableColumn({
          name: 'clienteDocumento',
          type: 'varchar',
          length: '255',
          isNullable: true, // Cambiado a nullable para evitar problemas con datos existentes
        }),
      );

      // Crear índice único (pero permitiendo NULL)
      await queryRunner.query(
        `CREATE UNIQUE INDEX \`IDX_40e6ad87dd45613db7c261ac3d\` ON \`clientes\` (\`clienteDocumento\`)`,
      );
    }

    // Restaurar clienteCorreo
    const hasClienteCorreo = table.findColumnByName('clienteCorreo');
    if (!hasClienteCorreo) {
      await queryRunner.addColumn(
        'clientes',
        new TableColumn({
          name: 'clienteCorreo',
          type: 'varchar',
          length: '255',
          isNullable: true,
        }),
      );
    }
  }
}
