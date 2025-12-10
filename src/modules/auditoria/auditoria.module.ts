import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditoriaEliminacion } from './auditoria.entity';
import { AuditoriaService } from './auditoria.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditoriaEliminacion])],
  providers: [AuditoriaService],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}

