import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BodegasController } from './bodegas.controller';
import { BodegasService } from './bodegas.service';
import { Bodega } from './bodega.entity';
import { GruposModule } from '../grupos/grupos.module';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bodega]),
    forwardRef(() => GruposModule),
    forwardRef(() => UsersModule),
    RolesModule,
  ],
  controllers: [BodegasController],
  providers: [BodegasService],
  exports: [BodegasService],
})
export class BodegasModule {}

