import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { GruposModule } from '../grupos/grupos.module';
import { UsuariosGruposModule } from '../usuarios-grupos/usuarios-grupos.module';
import { InventarioTecnicoModule } from '../inventario-tecnico/inventario-tecnico.module';
import { MovimientosModule } from '../movimientos/movimientos.module';
import { InventariosModule } from '../inventarios/inventarios.module';
import { BodegasModule } from '../bodegas/bodegas.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => GruposModule),
    forwardRef(() => UsuariosGruposModule),
    forwardRef(() => InventarioTecnicoModule),
    forwardRef(() => MovimientosModule),
    forwardRef(() => InventariosModule),
    forwardRef(() => BodegasModule),
    forwardRef(() => RolesModule),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
