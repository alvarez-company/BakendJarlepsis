import { Module, forwardRef } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { MaterialesModule } from '../materiales/materiales.module';
import { InstalacionesModule } from '../instalaciones/instalaciones.module';
import { MovimientosModule } from '../movimientos/movimientos.module';
import { TrasladosModule } from '../traslados/traslados.module';
import { UsersModule } from '../users/users.module';
import { ClientesModule } from '../clientes/clientes.module';
import { ProyectosModule } from '../proyectos/proyectos.module';
import { BodegasModule } from '../bodegas/bodegas.module';
import { SedesModule } from '../sedes/sedes.module';

@Module({
  imports: [
    forwardRef(() => MaterialesModule),
    forwardRef(() => InstalacionesModule),
    forwardRef(() => MovimientosModule),
    forwardRef(() => TrasladosModule),
    forwardRef(() => UsersModule),
    forwardRef(() => ClientesModule),
    forwardRef(() => ProyectosModule),
    forwardRef(() => BodegasModule),
    forwardRef(() => SedesModule),
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}

