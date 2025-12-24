import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditoriaInventario } from './auditoria-inventario.entity';
import { AuditoriaInventarioService } from './auditoria-inventario.service';
import { AuditoriaInventarioController } from './auditoria-inventario.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AuditoriaInventario])],
  controllers: [AuditoriaInventarioController],
  providers: [AuditoriaInventarioService],
  exports: [AuditoriaInventarioService],
})
export class AuditoriaInventarioModule {}

