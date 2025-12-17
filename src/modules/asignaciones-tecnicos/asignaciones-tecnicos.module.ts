import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AsignacionTecnico } from './asignacion-tecnico.entity';
import { AsignacionesTecnicosService } from './asignaciones-tecnicos.service';
import { AsignacionesTecnicosController } from './asignaciones-tecnicos.controller';
import { InventariosModule } from '../inventarios/inventarios.module';
import { UsersModule } from '../users/users.module';
import { ExportacionModule } from '../exportacion/exportacion.module';
import { MovimientosModule } from '../movimientos/movimientos.module';
import { InventarioTecnicoModule } from '../inventario-tecnico/inventario-tecnico.module';
import { NumerosMedidorModule } from '../numeros-medidor/numeros-medidor.module';
import { MaterialesModule } from '../materiales/materiales.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AsignacionTecnico]),
    forwardRef(() => InventariosModule),
    forwardRef(() => UsersModule),
    forwardRef(() => MovimientosModule),
    forwardRef(() => InventarioTecnicoModule),
    forwardRef(() => NumerosMedidorModule),
    forwardRef(() => MaterialesModule),
    AuditoriaModule,
    ExportacionModule,
  ],
  controllers: [AsignacionesTecnicosController],
  providers: [AsignacionesTecnicosService],
  exports: [AsignacionesTecnicosService],
})
export class AsignacionesTecnicosModule {}

