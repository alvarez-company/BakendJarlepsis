import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProyectoRedes } from './entities/proyecto-redes.entity';
import { ProyectoRedesActividad } from './entities/proyecto-redes-actividad.entity';
import { ProyectosRedesService } from './proyectos-redes.service';
import { ProyectosRedesController } from './proyectos-redes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProyectoRedes, ProyectoRedesActividad])],
  controllers: [ProyectosRedesController],
  providers: [ProyectosRedesService],
  exports: [ProyectosRedesService],
})
export class ProyectosRedesModule {}
