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
import { ExportacionModule } from '../exportacion/exportacion.module';
import { InventarioTecnicoModule } from '../inventario-tecnico/inventario-tecnico.module';
import { NumerosMedidorModule } from '../numeros-medidor/numeros-medidor.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MovimientoInventario]),
    MaterialesModule,
    InventariosModule,
    ProveedoresModule,
    forwardRef(() => UsersModule), // Usar forwardRef para evitar dependencia circular
    AuditoriaModule,
    ExportacionModule,
    forwardRef(() => InventarioTecnicoModule),
    forwardRef(() => NumerosMedidorModule),
  ],
  controllers: [MovimientosController],
  providers: [MovimientosService],
  exports: [MovimientosService],
})
export class MovimientosModule {}

