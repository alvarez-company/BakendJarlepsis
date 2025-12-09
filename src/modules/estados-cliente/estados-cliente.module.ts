import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstadoClienteEntity } from './estado-cliente.entity';
import { EstadosClienteService } from './estados-cliente.service';
import { EstadosClienteController } from './estados-cliente.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EstadoClienteEntity])],
  controllers: [EstadosClienteController],
  providers: [EstadosClienteService],
  exports: [EstadosClienteService],
})
export class EstadosClienteModule {}

