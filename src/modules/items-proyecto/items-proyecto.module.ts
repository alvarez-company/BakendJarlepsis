import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemsProyectoService } from './items-proyecto.service';
import { ItemsProyectoController } from './items-proyecto.controller';
import { ItemProyecto } from './item-proyecto.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ItemProyecto])],
  controllers: [ItemsProyectoController],
  providers: [ItemsProyectoService],
  exports: [ItemsProyectoService],
})
export class ItemsProyectoModule {}

