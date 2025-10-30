import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstadosUsuarioService } from './estados-usuario.service';
import { EstadosUsuarioController } from './estados-usuario.controller';
import { EstadoUsuario } from './estado-usuario.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EstadoUsuario])],
  controllers: [EstadosUsuarioController],
  providers: [EstadosUsuarioService],
  exports: [EstadosUsuarioService],
})
export class EstadosUsuarioModule {}

