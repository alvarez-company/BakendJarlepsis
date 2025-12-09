import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstalacionMaterial } from './instalacion-material.entity';
import { InstalacionesMaterialesService } from './instalaciones-materiales.service';
import { InstalacionesMaterialesController } from './instalaciones-materiales.controller';
import { InstalacionesModule } from '../instalaciones/instalaciones.module';
import { InventarioTecnicoModule } from '../inventario-tecnico/inventario-tecnico.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InstalacionMaterial]),
    forwardRef(() => InstalacionesModule),
    forwardRef(() => InventarioTecnicoModule),
  ],
  controllers: [InstalacionesMaterialesController],
  providers: [InstalacionesMaterialesService],
  exports: [InstalacionesMaterialesService],
})
export class InstalacionesMaterialesModule {}

