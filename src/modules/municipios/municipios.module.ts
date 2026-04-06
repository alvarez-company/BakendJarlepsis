import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MunicipiosController } from './municipios.controller';
import { MunicipiosService } from './municipios.service';
import { Municipio } from './municipio.entity';
import { Departamento } from '../departamentos/departamento.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Municipio, Departamento])],
  controllers: [MunicipiosController],
  providers: [MunicipiosService],
  exports: [MunicipiosService],
})
export class MunicipiosModule {}
