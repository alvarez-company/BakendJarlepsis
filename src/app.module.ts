import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PaisesModule } from './modules/paises/paises.module';
import { DepartamentosModule } from './modules/departamentos/departamentos.module';
import { MunicipiosModule } from './modules/municipios/municipios.module';
import { SedesModule } from './modules/sedes/sedes.module';
import { BodegasModule } from './modules/bodegas/bodegas.module';
import { CategoriasModule } from './modules/categorias/categorias.module';
import { ProveedoresModule } from './modules/proveedores/proveedores.module';
import { InventariosModule } from './modules/inventarios/inventarios.module';
import { MaterialesModule } from './modules/materiales/materiales.module';
import { InstalacionesModule } from './modules/instalaciones/instalaciones.module';
import { MovimientosModule } from './modules/movimientos/movimientos.module';
import { TrasladosModule } from './modules/traslados/traslados.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { TiposInstalacionModule } from './modules/tipos-instalacion/tipos-instalacion.module';
import { ProyectosModule } from './modules/proyectos/proyectos.module';
import { TiposProyectoModule } from './modules/tipos-proyecto/tipos-proyecto.module';
import { ItemsProyectoModule } from './modules/items-proyecto/items-proyecto.module';
import { InstalacionesUsuariosModule } from './modules/instalaciones-usuarios/instalaciones-usuarios.module';
import { EstadosUsuarioModule } from './modules/estados-usuario/estados-usuario.module';
import { GruposModule } from './modules/grupos/grupos.module';
import { UsuariosGruposModule } from './modules/usuarios-grupos/usuarios-grupos.module';
import { MensajesModule } from './modules/mensajes/mensajes.module';
import { ReaccionesMensajeModule } from './modules/reacciones-mensaje/reacciones-mensaje.module';
import { NotificacionesModule } from './modules/notificaciones/notificaciones.module';
import { ChatModule } from './modules/chat/chat.module';
import { TiposDocumentosIdentidadModule } from './modules/tipos-documentos-identidad/tipos-documentos-identidad.module';
import { UnidadesMedidaModule } from './modules/unidades-medida/unidades-medida.module';
import { ClasificacionesModule } from './modules/clasificaciones/clasificaciones.module';
import { StatsModule } from './modules/stats/stats.module';
import { ExportacionModule } from './modules/exportacion/exportacion.module';
import { CommonModule } from './common/common.module';
import { InventarioTecnicoModule } from './modules/inventario-tecnico/inventario-tecnico.module';
import { AsignacionesTecnicosModule } from './modules/asignaciones-tecnicos/asignaciones-tecnicos.module';
import { InstalacionesMaterialesModule } from './modules/instalaciones-materiales/instalaciones-materiales.module';
import { EstadosInstalacionModule } from './modules/estados-instalacion/estados-instalacion.module';
import { EstadosClienteModule } from './modules/estados-cliente/estados-cliente.module';
import { EstadosMovimientoModule } from './modules/estados-movimiento/estados-movimiento.module';
import { EstadosTrasladoModule } from './modules/estados-traslado/estados-traslado.module';
import { HealthModule } from './modules/health/health.module';
import { NumerosMedidorModule } from './modules/numeros-medidor/numeros-medidor.module';
import { SearchModule } from './modules/search/search.module';
import { AuditoriaInventarioModule } from './modules/auditoria-inventario/auditoria-inventario.module';
import { UploadModule } from './modules/upload/upload.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('DB_HOST', '127.0.0.1');
        const port = configService.get<string>('DB_PORT', '3306');
        const username = configService.get<string>('DB_USERNAME', 'root');
        const password = configService.get<string>('DB_PASSWORD', '') || '';
        const database = configService.get<string>('DB_NAME', 'jarlepsisdev');

        // Database configuration

        const config = {
          type: 'mysql' as const,
          host,
          port: parseInt(port, 10),
          username,
          password: password || '',
          database,
          autoLoadEntities: true,
          synchronize: false,
          logging: false,
          retryAttempts: 3,
          retryDelay: 2000,
          // Opciones para conexiones remotas: mantener conexión viva y timeout más tolerante
          extra: {
            connectionLimit: 20, // Aumentado de 10 a 20 para manejar más conexiones simultáneas
            connectTimeout: 60000, // 60 segundos para establecer conexión
            acquireTimeout: 60000, // 60 segundos para adquirir conexión del pool
            timeout: 60000, // 60 segundos para ejecutar queries
            enableKeepAlive: true,
            keepAliveInitialDelay: 0,
            waitForConnections: true,
            queueLimit: 0,
          },
        };

        return config;
      },
      inject: [ConfigService],
    }),
    // Modules
    CommonModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PaisesModule,
    DepartamentosModule,
    MunicipiosModule,
    SedesModule,
    BodegasModule,
    CategoriasModule,
    ProveedoresModule,
    InventariosModule,
    MaterialesModule,
    InstalacionesModule,
    MovimientosModule,
    TrasladosModule,
    ClientesModule,
    TiposInstalacionModule,
    ProyectosModule,
    TiposProyectoModule,
    ItemsProyectoModule,
    InstalacionesUsuariosModule,
    EstadosUsuarioModule,
    GruposModule,
    UsuariosGruposModule,
    MensajesModule,
    ReaccionesMensajeModule,
    NotificacionesModule,
    ChatModule,
    TiposDocumentosIdentidadModule,
    UnidadesMedidaModule,
    ClasificacionesModule,
    StatsModule,
    ExportacionModule,
    InventarioTecnicoModule,
    AsignacionesTecnicosModule,
    InstalacionesMaterialesModule,
    EstadosInstalacionModule,
    EstadosClienteModule,
    EstadosMovimientoModule,
    EstadosTrasladoModule,
    HealthModule,
    NumerosMedidorModule,
    SearchModule,
    AuditoriaInventarioModule,
    UploadModule,
  ],
})
export class AppModule {}
