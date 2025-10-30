import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuariosGruposService } from './usuarios-grupos.service';
import { UsuariosGruposController } from './usuarios-grupos.controller';
import { UsuarioGrupo } from './usuario-grupo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UsuarioGrupo])],
  controllers: [UsuariosGruposController],
  providers: [UsuariosGruposService],
  exports: [UsuariosGruposService],
})
export class UsuariosGruposModule {}

