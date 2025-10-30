import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovimientosController } from './movimientos.controller';
import { MovimientosService } from './movimientos.service';
import { MovimientoInventario } from './movimiento-inventario.entity';
import { MaterialesModule } from '../materiales/materiales.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MovimientoInventario]),
    MaterialesModule,
  ],
  controllers: [MovimientosController],
  providers: [MovimientosService],
  exports: [MovimientosService],
})
export class MovimientosModule {}

