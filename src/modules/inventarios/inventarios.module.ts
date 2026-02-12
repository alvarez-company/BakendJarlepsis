import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventariosController } from './inventarios.controller';
import { InventariosService } from './inventarios.service';
import { Inventario } from './inventario.entity';
import { ExportacionModule } from '../exportacion/exportacion.module';
import { BodegasModule } from '../bodegas/bodegas.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventario]),
    ExportacionModule,
    forwardRef(() => BodegasModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [InventariosController],
  providers: [InventariosService],
  exports: [InventariosService],
})
export class InventariosModule {}
