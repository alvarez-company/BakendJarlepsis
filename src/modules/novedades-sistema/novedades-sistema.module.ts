import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NovedadesSistemaService } from './novedades-sistema.service';
import { NovedadesSistemaController } from './novedades-sistema.controller';
import { NovedadSistema } from './novedad-sistema.entity';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NovedadSistema]),
    forwardRef(() => NotificacionesModule),
  ],
  controllers: [NovedadesSistemaController],
  providers: [NovedadesSistemaService],
  exports: [NovedadesSistemaService],
})
export class NovedadesSistemaModule {}
