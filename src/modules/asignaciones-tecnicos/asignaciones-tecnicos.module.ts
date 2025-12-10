import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AsignacionTecnico } from './asignacion-tecnico.entity';
import { AsignacionesTecnicosService } from './asignaciones-tecnicos.service';
import { AsignacionesTecnicosController } from './asignaciones-tecnicos.controller';
import { InventariosModule } from '../inventarios/inventarios.module';
import { UsersModule } from '../users/users.module';
import { ExportacionModule } from '../exportacion/exportacion.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AsignacionTecnico]),
    forwardRef(() => InventariosModule),
    forwardRef(() => UsersModule),
    ExportacionModule,
  ],
  controllers: [AsignacionesTecnicosController],
  providers: [AsignacionesTecnicosService],
  exports: [AsignacionesTecnicosService],
})
export class AsignacionesTecnicosModule {}

