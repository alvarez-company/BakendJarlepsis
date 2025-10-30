import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstalacionesUsuariosService } from './instalaciones-usuarios.service';
import { InstalacionesUsuariosController } from './instalaciones-usuarios.controller';
import { InstalacionUsuario } from './instalacion-usuario.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InstalacionUsuario])],
  controllers: [InstalacionesUsuariosController],
  providers: [InstalacionesUsuariosService],
  exports: [InstalacionesUsuariosService],
})
export class InstalacionesUsuariosModule {}

