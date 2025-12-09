import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { Material } from '../materiales/material.entity';
import { Instalacion } from '../instalaciones/instalacion.entity';
import { MovimientoInventario } from '../movimientos/movimiento-inventario.entity';
import { Traslado } from '../traslados/traslado.entity';
import { Cliente } from '../clientes/cliente.entity';
import { User } from '../users/user.entity';
import { InstalacionUsuario } from '../instalaciones-usuarios/instalacion-usuario.entity';
import { Municipio } from '../municipios/municipio.entity';
import { Categoria } from '../categorias/categoria.entity';
import { InventarioTecnico } from '../inventario-tecnico/inventario-tecnico.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Material,
      Instalacion,
      MovimientoInventario,
      Traslado,
      Cliente,
      User,
      InstalacionUsuario,
      Municipio,
      Categoria,
      InventarioTecnico,
    ]),
  ],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}

