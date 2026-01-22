import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GruposService } from './grupos.service';
import { GruposController } from './grupos.controller';
import { Grupo } from './grupo.entity';
import { MensajesModule } from '../mensajes/mensajes.module';
import { UsersModule } from '../users/users.module';
import { UsuariosGruposModule } from '../usuarios-grupos/usuarios-grupos.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Grupo]),
    forwardRef(() => MensajesModule),
    forwardRef(() => UsersModule),
    forwardRef(() => UsuariosGruposModule),
    forwardRef(() => NotificacionesModule),
    forwardRef(() => ChatModule),
  ],
  controllers: [GruposController],
  providers: [GruposService],
  exports: [GruposService],
})
export class GruposModule {}
