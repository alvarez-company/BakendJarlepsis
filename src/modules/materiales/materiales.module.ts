import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialesController } from './materiales.controller';
import { MaterialesService } from './materiales.service';
import { Material } from './material.entity';
import { MaterialBodega } from './material-bodega.entity';
import { InventariosModule } from '../inventarios/inventarios.module';
import { BodegasModule } from '../bodegas/bodegas.module';
import { ExportacionModule } from '../exportacion/exportacion.module';
import { InventarioTecnicoModule } from '../inventario-tecnico/inventario-tecnico.module';
import { NumerosMedidorModule } from '../numeros-medidor/numeros-medidor.module';
import { AuditoriaInventarioModule } from '../auditoria-inventario/auditoria-inventario.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Material, MaterialBodega]),
    InventariosModule,
    forwardRef(() => BodegasModule),
    ExportacionModule,
    forwardRef(() => InventarioTecnicoModule),
    forwardRef(() => NumerosMedidorModule),
    AuditoriaInventarioModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [MaterialesController],
  providers: [MaterialesService],
  exports: [MaterialesService],
})
export class MaterialesModule {}
