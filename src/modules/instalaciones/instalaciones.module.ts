import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstalacionesController } from './instalaciones.controller';
import { InstalacionesService } from './instalaciones.service';
import { Instalacion } from './instalacion.entity';
import { Cliente } from '../clientes/cliente.entity';
import { ChatModule } from '../chat/chat.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { InstalacionesUsuariosModule } from '../instalaciones-usuarios/instalaciones-usuarios.module';
import { MovimientosModule } from '../movimientos/movimientos.module';
import { MaterialesModule } from '../materiales/materiales.module';
import { InventariosModule } from '../inventarios/inventarios.module';
import { ClientesModule } from '../clientes/clientes.module';
import { GruposModule } from '../grupos/grupos.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { ExportacionModule } from '../exportacion/exportacion.module';
import { EstadosInstalacionModule } from '../estados-instalacion/estados-instalacion.module';
import { InstalacionesMaterialesModule } from '../instalaciones-materiales/instalaciones-materiales.module';
import { InventarioTecnicoModule } from '../inventario-tecnico/inventario-tecnico.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Instalacion, Cliente]),
    forwardRef(() => ChatModule),
    forwardRef(() => NotificacionesModule),
    forwardRef(() => InstalacionesUsuariosModule),
    forwardRef(() => ClientesModule),
    forwardRef(() => GruposModule),
    MovimientosModule,
    MaterialesModule,
    InventariosModule,
    AuditoriaModule,
    ExportacionModule,
    EstadosInstalacionModule,
    forwardRef(() => InstalacionesMaterialesModule),
    forwardRef(() => InventarioTecnicoModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [InstalacionesController],
  providers: [InstalacionesService],
  exports: [InstalacionesService],
})
export class InstalacionesModule {}

