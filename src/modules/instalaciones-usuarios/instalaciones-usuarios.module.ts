import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstalacionesUsuariosService } from './instalaciones-usuarios.service';
import { InstalacionesUsuariosController } from './instalaciones-usuarios.controller';
import { InstalacionUsuario } from './instalacion-usuario.entity';
import { User } from '../users/user.entity';
import { InstalacionesModule } from '../instalaciones/instalaciones.module';
import { ClientesModule } from '../clientes/clientes.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { ChatModule } from '../chat/chat.module';
import { UsersModule } from '../users/users.module';
import { GruposModule } from '../grupos/grupos.module';
import { UsuariosGruposModule } from '../usuarios-grupos/usuarios-grupos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InstalacionUsuario, User]),
    forwardRef(() => InstalacionesModule),
    forwardRef(() => ClientesModule),
    forwardRef(() => NotificacionesModule),
    forwardRef(() => ChatModule),
    forwardRef(() => UsersModule),
    forwardRef(() => GruposModule),
    forwardRef(() => UsuariosGruposModule),
  ],
  controllers: [InstalacionesUsuariosController],
  providers: [InstalacionesUsuariosService],
  exports: [InstalacionesUsuariosService],
})
export class InstalacionesUsuariosModule {}

