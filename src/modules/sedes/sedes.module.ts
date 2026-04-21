import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SedesController } from './sedes.controller';
import { SedesService } from './sedes.service';
import { Sede } from './sede.entity';
import { Departamento } from '../departamentos/departamento.entity';
import { AuthModule } from '../auth/auth.module';
import { GruposModule } from '../grupos/grupos.module';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';
import { BodegasModule } from '../bodegas/bodegas.module';
import { InventariosModule } from '../inventarios/inventarios.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sede, Departamento]),
    AuthModule,
    forwardRef(() => GruposModule),
    forwardRef(() => UsersModule),
    RolesModule,
    forwardRef(() => BodegasModule),
    forwardRef(() => InventariosModule),
  ],
  controllers: [SedesController],
  providers: [SedesService],
  exports: [SedesService],
})
export class SedesModule {}
