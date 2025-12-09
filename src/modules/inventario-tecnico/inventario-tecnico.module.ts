import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventarioTecnico } from './inventario-tecnico.entity';
import { InventarioTecnicoService } from './inventario-tecnico.service';
import { InventarioTecnicoController } from './inventario-tecnico.controller';
import { MovimientosModule } from '../movimientos/movimientos.module';
import { InventariosModule } from '../inventarios/inventarios.module';
import { AsignacionesTecnicosModule } from '../asignaciones-tecnicos/asignaciones-tecnicos.module';
import { MaterialesModule } from '../materiales/materiales.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InventarioTecnico]),
    forwardRef(() => MovimientosModule),
    forwardRef(() => InventariosModule),
    forwardRef(() => AsignacionesTecnicosModule),
    forwardRef(() => MaterialesModule),
  ],
  controllers: [InventarioTecnicoController],
  providers: [InventarioTecnicoService],
  exports: [InventarioTecnicoService],
})
export class InventarioTecnicoModule {}

