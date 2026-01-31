import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventariosController } from './inventarios.controller';
import { InventariosService } from './inventarios.service';
import { Inventario } from './inventario.entity';
import { ExportacionModule } from '../exportacion/exportacion.module';
import { BodegasModule } from '../bodegas/bodegas.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventario]),
    ExportacionModule,
    forwardRef(() => BodegasModule),
  ],
  controllers: [InventariosController],
  providers: [InventariosService],
  exports: [InventariosService],
})
export class InventariosModule {}
