import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransferenciaTecnico } from './transferencia-tecnico.entity';
import { TransferenciasTecnicosService } from './transferencias-tecnicos.service';
import { InventarioTecnicoModule } from '../inventario-tecnico/inventario-tecnico.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransferenciaTecnico]),
    forwardRef(() => InventarioTecnicoModule),
    AuditoriaModule,
  ],
  providers: [TransferenciasTecnicosService],
  exports: [TransferenciasTecnicosService],
})
export class TransferenciasTecnicosModule {}
