import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstadoInstalacionEntity } from './estado-instalacion.entity';
import { EstadosInstalacionService } from './estados-instalacion.service';
import { EstadosInstalacionController } from './estados-instalacion.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EstadoInstalacionEntity])],
  controllers: [EstadosInstalacionController],
  providers: [EstadosInstalacionService],
  exports: [EstadosInstalacionService],
})
export class EstadosInstalacionModule {}
