import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrasladosController } from './traslados.controller';
import { TrasladosService } from './traslados.service';
import { Traslado } from './traslado.entity';
import { TransferenciaTecnico } from '../transferencias-tecnicos/transferencia-tecnico.entity';
import { MovimientosModule } from '../movimientos/movimientos.module';
import { MaterialesModule } from '../materiales/materiales.module';
import { InventariosModule } from '../inventarios/inventarios.module';
import { BodegasModule } from '../bodegas/bodegas.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { ExportacionModule } from '../exportacion/exportacion.module';
import { NumerosMedidorModule } from '../numeros-medidor/numeros-medidor.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Traslado, TransferenciaTecnico]),
    MovimientosModule,
    MaterialesModule,
    InventariosModule,
    BodegasModule,
    AuditoriaModule,
    ExportacionModule,
    NumerosMedidorModule,
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [TrasladosController],
  providers: [TrasladosService],
  exports: [TrasladosService],
})
export class TrasladosModule {}
