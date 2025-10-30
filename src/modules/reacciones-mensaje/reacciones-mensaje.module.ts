import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReaccionesMensajeService } from './reacciones-mensaje.service';
import { ReaccionesMensajeController } from './reacciones-mensaje.controller';
import { ReaccionMensaje } from './reaccion-mensaje.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ReaccionMensaje])],
  controllers: [ReaccionesMensajeController],
  providers: [ReaccionesMensajeService],
  exports: [ReaccionesMensajeService],
})
export class ReaccionesMensajeModule {}

