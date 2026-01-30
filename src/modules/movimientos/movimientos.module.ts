import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovimientosController } from './movimientos.controller';
import { MovimientosService } from './movimientos.service';
import { MovimientoInventario } from './movimiento-inventario.entity';
import { MaterialesModule } from '../materiales/materiales.module';
import { InventariosModule } from '../inventarios/inventarios.module';
import { ProveedoresModule } from '../proveedores/proveedores.module';
import { UsersModule } from '../users/users.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { AuditoriaInventarioModule } from '../auditoria-inventario/auditoria-inventario.module';
import { ExportacionModule } from '../exportacion/exportacion.module';
import { InventarioTecnicoModule } from '../inventario-tecnico/inventario-tecnico.module';
import { NumerosMedidorModule } from '../numeros-medidor/numeros-medidor.module';
import { BodegasModule } from '../bodegas/bodegas.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MovimientoInventario]),
    forwardRef(() => BodegasModule),
    MaterialesModule,
    InventariosModule,
    ProveedoresModule,
    forwardRef(() => UsersModule), // Usar forwardRef para evitar dependencia circular
    AuditoriaModule,
    AuditoriaInventarioModule,
    ExportacionModule,
    forwardRef(() => InventarioTecnicoModule),
    forwardRef(() => NumerosMedidorModule),
  ],
  controllers: [MovimientosController],
  providers: [MovimientosService],
  exports: [MovimientosService],
})
export class MovimientosModule {}
