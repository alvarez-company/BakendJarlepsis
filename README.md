# BakendJarlepsis – Backend del Sistema de Inventario

Backend desarrollado con **NestJS**, **MySQL** y **Docker** para el sistema de gestión de inventario y centros operativos Jarlepsis.

## 📦 Repositorio

**Repositorio**: [https://github.com/alvarez-company/BakendJarlepsis](https://github.com/alvarez-company/BakendJarlepsis)

## 🎯 Características

- 🔐 **Autenticación JWT** con Passport
- 👥 **Sistema de roles**: SuperAdmin, Gerencia, Admin, Admin Internas/Redes, Almacenista, Bodega Internas/Redes, Técnico, Soldador
- 🏢 **Jerarquía**: Sedes (centros operativos) → Bodegas
- 🗄️ **MySQL** con TypeORM
- 🐳 **Docker** para base de datos y opcionalmente para el backend
- 📝 **Swagger** en `/api/docs`
- 🔒 **Seguridad**: Helmet, rate limiting, validación con class-validator
- 💬 **Chat y notificaciones** en tiempo real (WebSockets)
- 📊 **Estadísticas**, reportes y búsqueda global

## 🏗️ Arquitectura

### Jerarquía organizacional

```
Sede (centro operativo)
 └── Bodega (internas, redes o instalaciones)
```

### Roles de usuario

| Rol | Descripción |
|-----|-------------|
| **SuperAdmin** | Acceso total; puede cambiar de rol y gestionar todo el sistema y personificacion |
| **Gerencia** | Gestión global; crea usuarios de cualquier rol y asigna centros/bodegas |
| **Admin** | Administrador de centro operativo; gestiona su centro operativo o sede y bodegas |
| **Admin Internas / Admin Redes** | Admin restringido a bodegas de tipo internas o redes de su sede |
| **Almacenista** | Gestión de inventario en su centro operativo |
| **Bodega Internas / Bodega Redes** | Usuario asignado a una bodega concreta (internas o redes) |
| **Técnico** | Acceso a instalaciones asignadas y miniapp móvil |
| **Soldador** |Es igual al rol tecnico |

## 🚀 Inicio rápido

### Con Docker (recomendado para base de datos)

```bash
cd BakendJarlepsis
cp env.example .env
# Editar .env si es necesario (puerto MySQL 3307 por defecto)
docker-compose up -d mysql
npm install
npm run migration:run
npm run seed
npm run start:dev
```

El API quedará en `http://localhost:4100` (puerto por defecto en `env.example`).

### Desarrollo local (sin Docker)

```bash
cd BakendJarlepsis
npm install
cp env.example .env
# Configurar .env con tu MySQL local
npm run migration:run
npm run seed
npm run start:dev
```

### Crear el primer usuario (SuperAdmin)

El registro público está deshabilitado. Para tener el primer SuperAdmin:

1. Ejecutar migraciones: `npm run migration:run`
2. Ejecutar seed completo (roles + superadmin): `npm run seed`  
   O solo superadmin: `npm run seed:superadmin`
3. Iniciar sesión con el SuperAdmin (por defecto: `admin@jarlepsis.com` / `Admin123`)
4. Crear el resto de usuarios desde el frontend o la API

Documentación detallada: `documents/SEED_Y_RESET.md`

## 📝 Variables de entorno

Copia `env.example` a `.env` y ajusta los valores:

```env
NODE_ENV=development
PORT=4100

# MySQL (con Docker: host 127.0.0.1, puerto 3307)
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USERNAME=root
DB_PASSWORD=root
DB_NAME=jarlepsisdev

# JWT
JWT_SECRET=tu-clave-secreta-segura
JWT_EXPIRES_IN=24h

# URLs de frontend y miniapp (CORS y redirecciones)
FRONTEND_URL=http://localhost:4173
MINIAPP_URL=http://localhost:4174

# Usuario admin para seed (opcional)
ADMIN_EMAIL=admin@jarlepsis.com
ADMIN_PASSWORD=Admin123
ADMIN_NOMBRE=Super
ADMIN_APELLIDO=Admin
ADMIN_DOCUMENTO=9999999999
```

## 📊 API y documentación

- **Swagger (OpenAPI)**: con el servidor en marcha, `http://localhost:4100/api/docs`
- **Rutas principales**: ver `documents/API_ROUTES.md`
- **Resumen de roles y permisos**: `documents/ROLES_SUMMARY.md`

Prefijo base: `/api/v1` (auth, users, roles, sedes, bodegas, materiales, movimientos, inventarios, instalaciones, mensajes, chat, notificaciones, traslados, stats, etc.).

## 📁 Estructura del proyecto

```
BakendJarlepsis/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/           # TypeORM, etc.
│   ├── common/           # Guards, decoradores, DTOs compartidos
│   └── modules/         # Módulos de negocio
│       ├── auth/
│       ├── users/
│       ├── roles/
│       ├── sedes/
│       ├── bodegas/
│       ├── materiales/
│       ├── movimientos/
│       ├── inventarios/
│       ├── instalaciones/
│       ├── mensajes/
│       ├── chat/
│       ├── notificaciones/
│       ├── traslados/
│       ├── stats/
│       └── ...
├── documents/            # Documentación (API, Docker, roles, seed)
├── scripts/              # Seed, migraciones, reset DB
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## 🛠️ Scripts útiles

```bash
npm run start          # Servidor producción
npm run start:dev      # Desarrollo con recarga
npm run build          # Compilar
npm run lint           # Linter
npm run format         # Formatear con Prettier
npm run migration:run  # Ejecutar migraciones
npm run migration:revert
npm run seed           # Seed completo
npm run seed:superadmin
npm run db:reset       # Reset DB (pide confirmación)
npm run docker:db:up    # Levantar solo MySQL con Docker
```

## 🐳 Docker

- **Solo base de datos**: `docker-compose up -d mysql` (puerto 3307 en host por defecto).
- Documentación: `documents/README-DOCKER.md`, `documents/DOCKER.md`.

## 🔒 Seguridad

- JWT con expiración configurable
- Contraseñas con bcrypt
- Guards por rol en rutas sensibles
- Helmet, rate limiting, CORS y validación de entrada

## 📚 Documentación adicional

- `documents/SEED_Y_RESET.md` – Seed y reset de base de datos
- `documents/API_ROUTES.md` – Rutas del API
- `documents/ROLES_SUMMARY.md` – Roles y permisos
- `documents/README-DOCKER.md` – Uso de Docker
- `SECURITY.md` – Política de seguridad

---

**Desarrollado con NestJS**
