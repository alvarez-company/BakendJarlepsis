import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaisesController } from './paises.controller';
import { PaisesService } from './paises.service';
import { Pais } from './pais.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Pais])],
  controllers: [PaisesController],
  providers: [PaisesService],
  exports: [PaisesService],
})
export class PaisesModule {}

