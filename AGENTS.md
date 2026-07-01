# Jarlepsis Backend

## Dominio del Negocio

Jarlepsis es un **sistema ERP de gestión de inventario y operaciones de instalaciones de gas** para el contexto Metrogas (Colombia). El backend es la fuente de verdad para todos los clientes (frontend web y miniapp móvil).

### Problema que resuelve

- Control de stock de materiales en bodegas organizadas por sede
- Trazabilidad de medidores de gas por número de serie único
- Gestión del ciclo de vida de instalaciones de gas (internas y redes)
- Asignación y seguimiento de técnicos/soldadores con su inventario personal
- Movimientos de stock: entradas, salidas, devoluciones, traslados entre bodegas
- Comunicación operativa: chat grupal y notificaciones push

### Jerarquía organizacional

```
Sede (centro operativo)
└── Bodega (tipo: internas | redes)
    └── Inventario
        └── Materiales / Stock por bodega
```

### Pipeline de instalaciones

```
APM (Metrogas) → PPC (Pendiente obra) → AAT (Asignado técnico) → AVAN (Avance)
→ CONS (Construida) → CERT (Certificada) → FACT (Facturación)
Estados especiales: NOVE (Novedad), DEV (Devuelta)
```

## Stack Tecnológico

- **Framework**: NestJS 11 (Node.js)
- **Lenguaje**: TypeScript
- **Base de datos**: MySQL + TypeORM 0.3
- **Autenticación**: JWT + Passport
- **Tiempo real**: Socket.IO (WebSockets)
- **Push**: Firebase Admin
- **API docs**: Swagger en `/api/docs`
- **Prefijo API**: `/api/v1`

## Entidades Principales

### Organización
- `Sede`: Centro operativo con departamento y contacto
- `Bodega`: Almacén por sede (tipo internas/redes)
- `User`: Usuario con rol, sede y bodega asignada
- `Role`: Rol con permisos (SuperAdmin, Gerencia, Admin, Almacenista, Técnico, etc.)

### Inventario
- `Material`: Catálogo con código, stock, precio, categoría, proveedor
- `MaterialBodega`: Stock por material y bodega
- `NumeroMedidor`: Medidor serializado (estados: disponible → asignado_tecnico → en_instalacion → instalado)
- `MovimientoInventario`: Entrada/salida/devolución
- `Traslado`: Transferencia entre bodegas
- `InventarioTecnico`: Stock asignado a un técnico

### Instalaciones
- `Instalacion`: Obra con cliente, tipo, técnicos, medidor, sello, estados
- `InstalacionMaterial`: Materiales consumidos en una instalación
- `Cliente`: Persona beneficiaria de la instalación
- `Proyecto` / `ProyectoRedes`: Proyectos de obra

### Comunicación
- `Grupo`: Grupo de chat (general, sede, bodega, instalación, directo)
- `Mensaje`: Mensaje con respuestas y reacciones
- `Notificacion`: Alerta para usuarios
- `PushToken`: Token FCM para notificaciones push

## Arquitectura

```
src/
├── main.ts, app.module.ts
├── config/          # Configuración TypeORM
├── common/          # Guards, decorators, interceptors, filters, constants
├── modules/         # Un módulo por feature (51 módulos)
└── migrations/      # Migraciones TypeORM
```

### Patrones

- **Módulos NestJS**: `*.module.ts` + `*.controller.ts` + `*.service.ts` + `*.entity.ts` + `dto/`
- **RBAC declarativo**: `@Roles(...ROLES_*)` + `RolesGuard`
- **Respuestas uniformes**: `{ data, statusCode, message }` vía interceptor
- **Auditoría transversal**: Registro de eliminaciones y cambios de inventario
- **WebSockets**: `ChatGateway` con namespace `/chat`

## Convenciones de Código

### Nomenclatura
- **Entidades**: PascalCase, sufijo `.entity.ts`; tablas en español/plural
- **Campos**: camelCase con prefijo de entidad (`instalacionId`, `materialNombre`)
- **Módulos/carpetas**: kebab-case (`instalaciones-materiales`, `numeros-medidor`)
- **DTOs**: `create-*.dto.ts`, `update-*.dto.ts` con class-validator

### API
- Prefijo global: `api/v1`
- Swagger con `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`
- Rutas REST estándar

### Seguridad
- Roles en `src/common/constants/roles.constants.ts`
- Guards por controlador: `@UseGuards(JwtAuthGuard, ImpersonationGuard, RolesGuard)`
- SuperAdmin puede impersonar usuarios via header `X-Impersonate-User-Id`

### TypeORM
- `synchronize: false` - usar migraciones
- Relaciones como strings para evitar imports circulares
- `CreateDateColumn` / `UpdateDateColumn` como `fechaCreacion` / `fechaActualizacion`

## Módulos Clave

| Área | Módulos |
|------|---------|
| Auth & usuarios | `auth`, `users`, `roles` |
| Organización | `sedes`, `bodegas`, `departamentos`, `municipios` |
| Inventario | `inventarios`, `materiales`, `movimientos`, `traslados`, `numeros-medidor`, `inventario-tecnico` |
| Instalaciones | `instalaciones`, `instalaciones-materiales`, `clientes`, `asignaciones-tecnicos` |
| Comunicación | `chat`, `mensajes`, `notificaciones`, `grupos`, `push` |
| Reportes | `stats`, `exportacion`, `search` |

## Variables de Entorno Clave

```env
PORT=4100
DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME
JWT_SECRET, JWT_EXPIRATION
FIREBASE_* (para push notifications)
```

## Scripts Importantes

```bash
npm run start:dev          # Desarrollo
npm run migration:run      # Ejecutar migraciones
npm run seed:superadmin    # Crear superadmin inicial
npm run reconcile:*        # Scripts de reconciliación de inventario
```
