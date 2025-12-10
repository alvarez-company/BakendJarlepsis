import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClasificacionesService } from './clasificaciones.service';
import { ClasificacionesController } from './clasificaciones.controller';
import { Clasificacion } from './clasificacion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Clasificacion])],
  controllers: [ClasificacionesController],
  providers: [ClasificacionesService],
  exports: [ClasificacionesService],
})
export class ClasificacionesModule {}

