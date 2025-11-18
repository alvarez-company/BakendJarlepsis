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
import { OficinasModule } from './modules/oficinas/oficinas.module';
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
import { CommonModule } from './common/common.module';

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
        
        // Log configuration for debugging
        console.log('🔍 Database Configuration:');
        console.log('  Host:', host);
        console.log('  Port:', parseInt(port, 10));
        console.log('  Username:', username);
        console.log('  Password:', password ? '***SET***' : 'EMPTY');
        console.log('  Database:', database);
        
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
          retryAttempts: 1,
          retryDelay: 1000,
        };
        
        console.log('📝 TypeORM Config:', JSON.stringify({
          ...config,
          password: config.password ? '***' : undefined,
          entities: '[...]',
          migrations: '[...]',
        }, null, 2));
        
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
    OficinasModule,
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
  ],
})
export class AppModule {}
