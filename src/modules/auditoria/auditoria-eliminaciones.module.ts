import { Module } from '@nestjs/common';
import { AuditoriaModule } from './auditoria.module';
import { AuditoriaEliminacionesController } from './auditoria-eliminaciones.controller';
import { MovimientosModule } from '../movimientos/movimientos.module';
import { TrasladosModule } from '../traslados/traslados.module';
import { AsignacionesTecnicosModule } from '../asignaciones-tecnicos/asignaciones-tecnicos.module';
import { InstalacionesModule } from '../instalaciones/instalaciones.module';

@Module({
  imports: [
    AuditoriaModule,
    MovimientosModule,
    TrasladosModule,
    AsignacionesTecnicosModule,
    InstalacionesModule,
  ],
  controllers: [AuditoriaEliminacionesController],
})
export class AuditoriaEliminacionesModule {}

