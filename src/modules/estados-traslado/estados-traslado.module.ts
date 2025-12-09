import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstadoTrasladoEntity } from './estado-traslado.entity';
import { EstadosTrasladoService } from './estados-traslado.service';
import { EstadosTrasladoController } from './estados-traslado.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EstadoTrasladoEntity])],
  controllers: [EstadosTrasladoController],
  providers: [EstadosTrasladoService],
  exports: [EstadosTrasladoService],
})
export class EstadosTrasladoModule {}

