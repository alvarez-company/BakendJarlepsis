import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequerimientosService } from './requerimientos.service';
import { RequerimientosController } from './requerimientos.controller';
import { Requerimiento } from './requerimiento.entity';
import { NovedadesSistemaModule } from '../novedades-sistema/novedades-sistema.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Requerimiento]),
    forwardRef(() => NovedadesSistemaModule),
    UsersModule,
  ],
  controllers: [RequerimientosController],
  providers: [RequerimientosService],
  exports: [RequerimientosService],
})
export class RequerimientosModule {}
