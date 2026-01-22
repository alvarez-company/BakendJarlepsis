import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialesController } from './materiales.controller';
import { MaterialesService } from './materiales.service';
import { Material } from './material.entity';
import { MaterialBodega } from './material-bodega.entity';
import { InventariosModule } from '../inventarios/inventarios.module';
import { ExportacionModule } from '../exportacion/exportacion.module';
import { InventarioTecnicoModule } from '../inventario-tecnico/inventario-tecnico.module';
import { NumerosMedidorModule } from '../numeros-medidor/numeros-medidor.module';
import { AuditoriaInventarioModule } from '../auditoria-inventario/auditoria-inventario.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Material, MaterialBodega]),
    InventariosModule,
    ExportacionModule,
    forwardRef(() => InventarioTecnicoModule),
    forwardRef(() => NumerosMedidorModule),
    AuditoriaInventarioModule,
  ],
  controllers: [MaterialesController],
  providers: [MaterialesService],
  exports: [MaterialesService],
})
export class MaterialesModule {}
