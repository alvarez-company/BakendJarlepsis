import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OficinasController } from './oficinas.controller';
import { OficinasService } from './oficinas.service';
import { Oficina } from './oficina.entity';
import { GruposModule } from '../grupos/grupos.module';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Oficina]),
    forwardRef(() => GruposModule),
    forwardRef(() => UsersModule),
    RolesModule,
  ],
  controllers: [OficinasController],
  providers: [OficinasService],
  exports: [OficinasService],
})
export class OficinasModule {}

