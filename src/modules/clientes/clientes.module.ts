import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';
import { Cliente } from './cliente.entity';
import { ExportacionModule } from '../exportacion/exportacion.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cliente]),
    ExportacionModule,
  ],
  controllers: [ClientesController],
  providers: [ClientesService],
  exports: [ClientesService],
})
export class ClientesModule {}

