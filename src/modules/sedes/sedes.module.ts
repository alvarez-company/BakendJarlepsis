import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SedesController } from './sedes.controller';
import { SedesService } from './sedes.service';
import { Sede } from './sede.entity';
import { GruposModule } from '../grupos/grupos.module';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sede]),
    forwardRef(() => GruposModule),
    forwardRef(() => UsersModule),
    RolesModule,
  ],
  controllers: [SedesController],
  providers: [SedesService],
  exports: [SedesService],
})
export class SedesModule {}

