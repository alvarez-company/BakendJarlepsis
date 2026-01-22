import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrasladosController } from './traslados.controller';
import { TrasladosService } from './traslados.service';
import { Traslado } from './traslado.entity';
import { MovimientosModule } from '../movimientos/movimientos.module';
import { MaterialesModule } from '../materiales/materiales.module';
import { InventariosModule } from '../inventarios/inventarios.module';
import { BodegasModule } from '../bodegas/bodegas.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { ExportacionModule } from '../exportacion/exportacion.module';
import { NumerosMedidorModule } from '../numeros-medidor/numeros-medidor.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Traslado]),
    MovimientosModule,
    MaterialesModule,
    InventariosModule,
    BodegasModule,
    AuditoriaModule,
    ExportacionModule,
    NumerosMedidorModule,
  ],
  controllers: [TrasladosController],
  providers: [TrasladosService],
  exports: [TrasladosService],
})
export class TrasladosModule {}
