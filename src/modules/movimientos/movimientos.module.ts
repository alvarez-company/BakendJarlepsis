import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovimientosController } from './movimientos.controller';
import { MovimientosService } from './movimientos.service';
import { MovimientoInventario } from './movimiento-inventario.entity';
import { MaterialesModule } from '../materiales/materiales.module';
import { InventariosModule } from '../inventarios/inventarios.module';
import { ProveedoresModule } from '../proveedores/proveedores.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MovimientoInventario]),
    MaterialesModule,
    InventariosModule,
    ProveedoresModule,
    UsersModule,
  ],
  controllers: [MovimientosController],
  providers: [MovimientosService],
  exports: [MovimientosService],
})
export class MovimientosModule {}

