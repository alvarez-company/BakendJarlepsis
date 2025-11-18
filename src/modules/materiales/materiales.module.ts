import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialesController } from './materiales.controller';
import { MaterialesService } from './materiales.service';
import { Material } from './material.entity';
import { MaterialBodega } from './material-bodega.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Material, MaterialBodega])],
  controllers: [MaterialesController],
  providers: [MaterialesService],
  exports: [MaterialesService],
})
export class MaterialesModule {}

