import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventariosController } from './inventarios.controller';
import { InventariosService } from './inventarios.service';
import { Inventario } from './inventario.entity';
import { ExportacionModule } from '../exportacion/exportacion.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventario]),
    ExportacionModule,
  ],
  controllers: [InventariosController],
  providers: [InventariosService],
  exports: [InventariosService],
})
export class InventariosModule {}

