import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MensajesService } from './mensajes.service';
import { MensajesController } from './mensajes.controller';
import { Mensaje } from './mensaje.entity';
import { ChatModule } from '../chat/chat.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { UsuariosGruposModule } from '../usuarios-grupos/usuarios-grupos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Mensaje]),
    forwardRef(() => ChatModule),
    forwardRef(() => NotificacionesModule),
    forwardRef(() => UsuariosGruposModule),
  ],
  controllers: [MensajesController],
  providers: [MensajesService],
  exports: [MensajesService],
})
export class MensajesModule {}

