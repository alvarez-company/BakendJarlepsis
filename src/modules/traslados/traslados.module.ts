import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrasladosController } from './traslados.controller';
import { TrasladosService } from './traslados.service';
import { Traslado } from './traslado.entity';
import { MovimientosModule } from '../movimientos/movimientos.module';
import { MaterialesModule } from '../materiales/materiales.module';
import { InventariosModule } from '../inventarios/inventarios.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Traslado]),
    MovimientosModule,
    MaterialesModule,
    InventariosModule,
  ],
  controllers: [TrasladosController],
  providers: [TrasladosService],
  exports: [TrasladosService],
})
export class TrasladosModule {}

