import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TiposProyectoService } from './tipos-proyecto.service';
import { TiposProyectoController } from './tipos-proyecto.controller';
import { TipoProyecto } from './tipo-proyecto.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TipoProyecto])],
  controllers: [TiposProyectoController],
  providers: [TiposProyectoService],
  exports: [TiposProyectoService],
})
export class TiposProyectoModule {}
