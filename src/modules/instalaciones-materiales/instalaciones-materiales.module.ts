import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstalacionMaterial } from './instalacion-material.entity';
import { InstalacionesMaterialesService } from './instalaciones-materiales.service';
import { InstalacionesMaterialesController } from './instalaciones-materiales.controller';
import { InstalacionesModule } from '../instalaciones/instalaciones.module';
import { InventarioTecnicoModule } from '../inventario-tecnico/inventario-tecnico.module';
import { NumerosMedidorModule } from '../numeros-medidor/numeros-medidor.module';
import { MaterialesModule } from '../materiales/materiales.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InstalacionMaterial]),
    forwardRef(() => InstalacionesModule),
    forwardRef(() => InventarioTecnicoModule),
    forwardRef(() => NumerosMedidorModule),
    forwardRef(() => MaterialesModule),
  ],
  controllers: [InstalacionesMaterialesController],
  providers: [InstalacionesMaterialesService],
  exports: [InstalacionesMaterialesService],
})
export class InstalacionesMaterialesModule {}
