import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstadoMovimientoEntity } from './estado-movimiento.entity';
import { EstadosMovimientoService } from './estados-movimiento.service';
import { EstadosMovimientoController } from './estados-movimiento.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EstadoMovimientoEntity])],
  controllers: [EstadosMovimientoController],
  providers: [EstadosMovimientoService],
  exports: [EstadosMovimientoService],
})
export class EstadosMovimientoModule {}

