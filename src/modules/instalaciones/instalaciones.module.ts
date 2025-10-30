import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstalacionesController } from './instalaciones.controller';
import { InstalacionesService } from './instalaciones.service';
import { Instalacion } from './instalacion.entity';
import { ChatModule } from '../chat/chat.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { InstalacionesUsuariosModule } from '../instalaciones-usuarios/instalaciones-usuarios.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Instalacion]),
    forwardRef(() => ChatModule),
    forwardRef(() => NotificacionesModule),
    forwardRef(() => InstalacionesUsuariosModule),
  ],
  controllers: [InstalacionesController],
  providers: [InstalacionesService],
  exports: [InstalacionesService],
})
export class InstalacionesModule {}

