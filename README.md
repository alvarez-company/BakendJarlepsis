# Sistema de Inventario - Backend

Backend robusto desarrollado con NestJS, MySQL y Docker para gestión de inventario.

## 📦 Repositorio

**Repositorio**: [https://github.com/alvarez-company/BakendJarlepsis.git](https://github.com/alvarez-company/BakendJarlepsis.git)

## 🎯 Características

- 🔐 **Autenticación JWT** con Passport
- 👥 **Sistema de Roles**: SuperAdmin, Admin, Técnico
- 🏢 **Gestión Jerárquica**: Sedes → Oficinas → Bodegas
- 🗄️ **MySQL** con TypeORM
- 🐳 **Dockerizado** completamente
- 📝 **Swagger** para documentación de API
- 🔒 **Seguridad** con Helmet y Rate Limiting
- 📊 **Logging** con Winston
- ✅ **Validación** de datos con class-validator

## 🏗️ Arquitectura del Sistema

### Jerarquía Organizacional

```
Sede (por departamento)
 └── Oficina (por ciudad y municipio)
      └── Bodega (asignada a oficina)
```

### Roles de Usuario

1. **SuperAdmin**: Puede iniciar sesión y cambiarse a cualquier rol
2. **Admin**: Todos los permisos excepto cambiar roles
3. **Técnico**: Solo acceso a aplicación móvil (no web)

### Estructura de Usuarios

Los usuarios tienen los siguientes campos:
- usuarioId
- usuarioRolId
- usuarioSede
- usuarioBodega
- usuarioOficina
- usuarioNombre
- usuarioApellido
- usuarioCorreo
- usuarioTelefono
- usuarioDocumento
- usuarioContrasena
- usuarioCreador
- usuarioEstado
- fechaCreacion
- fechaActualizacion

## 🚀 Inicio Rápido

### Con Docker (Recomendado)

```bash
cd backend
cp env.example .env
docker-compose up -d
```

El backend estará disponible en `http://localhost:3000`

### Desarrollo Local

```bash
cd backend
npm install
cp env.example .env
npm run start:dev
```

### ⚠️ Crear Primer Usuario

**IMPORTANTE**: El registro público está deshabilitado. Debes crear el primer SuperAdmin con SQL:

1. Ver el archivo `PRIMER_USUARIO.md` para instrucciones detalladas
2. Ejecutar `src/migrations/seed_initial_data.sql` para crear roles y primer usuario
3. Login con el SuperAdmin creado
4. Crear el resto de usuarios desde la API

## 📝 Variables de Entorno

```env
NODE_ENV=development
PORT=3000

# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=root
DB_NAME=inventario_db

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Frontend
FRONTEND_URL=http://localhost:3000
```

## 📊 Endpoints Principales

### Autenticación
- `POST /api/v1/auth/register` - Registrar usuario
- `POST /api/v1/auth/login` - Iniciar sesión

### Usuarios
- `GET /api/v1/users` - Listar usuarios
- `GET /api/v1/users/:id` - Obtener usuario
- `POST /api/v1/users` - Crear usuario
- `PATCH /api/v1/users/:id` - Actualizar usuario
- `POST /api/v1/users/:id/change-role` - Cambiar rol (SuperAdmin)
- `DELETE /api/v1/users/:id` - Eliminar usuario

### Roles
- `GET /api/v1/roles` - Listar roles
- `POST /api/v1/roles` - Crear rol
- `PATCH /api/v1/roles/:id` - Actualizar rol
- `DELETE /api/v1/roles/:id` - Eliminar rol

### Sedes
- `GET /api/v1/sedes` - Listar sedes
- `POST /api/v1/sedes` - Crear sede
- `PATCH /api/v1/sedes/:id` - Actualizar sede
- `DELETE /api/v1/sedes/:id` - Eliminar sede

### Oficinas
- `GET /api/v1/oficinas` - Listar oficinas
- `POST /api/v1/oficinas` - Crear oficina
- `PATCH /api/v1/oficinas/:id` - Actualizar oficina
- `DELETE /api/v1/oficinas/:id` - Eliminar oficina

### Bodegas
- `GET /api/v1/bodegas` - Listar bodegas
- `POST /api/v1/bodegas` - Crear bodega
- `PATCH /api/v1/bodegas/:id` - Actualizar bodega
- `DELETE /api/v1/bodegas/:id` - Eliminar bodega

## 📚 Documentación API

Una vez que el servidor esté corriendo, accede a Swagger:
```
http://localhost:3000/api/docs
```

## 🔐 Roles y Permisos

### SuperAdmin
- Puede cambiar su rol al de cualquier usuario
- Acceso completo a todas las funcionalidades
- Puede eliminar usuarios, roles, sedes, oficinas y bodegas

### Admin
- Acceso a todas las funcionalidades CRUD
- No puede cambiar roles de usuarios
- Puede crear y actualizar sedes, oficinas y bodegas

### Técnico
- Solo acceso a aplicación móvil
- Sin acceso a la plataforma web
- Gestiona inventario desde dispositivos móviles

## 🛠️ Tecnologías

- **NestJS** 10.x
- **TypeORM**
- **MySQL** 8.0
- **Passport** + JWT
- **Bcrypt**
- **Helmet**
- **Winston**
- **Swagger**
- **Docker**

## 📦 Scripts Disponibles

```bash
npm run start          # Inicia servidor
npm run start:dev      # Desarrollo con hot-reload
npm run start:prod     # Producción
npm run build          # Compila proyecto
npm run test           # Ejecuta tests
npm run lint           # Analiza código
npm run format         # Formatea código
```

## 🔄 Migraciones

```bash
# Crear migración
npm run migration:generate -- -n NombreMigracion

# Ejecutar migraciones
npm run migration:run

# Revertir migración
npm run migration:revert
```

## 🐳 Docker

### Iniciar servicios
```bash
docker-compose up -d
```

### Ver logs
```bash
docker-compose logs -f backend
```

### Detener servicios
```bash
docker-compose down
```

## 📁 Estructura del Proyecto

```
backend/
├── src/
│   ├── main.ts                 # Punto de entrada
│   ├── app.module.ts           # Módulo raíz
│   ├── config/                 # Configuraciones
│   ├── common/                 # Código compartido
│   └── modules/                # Módulos de negocio
│       ├── auth/              # Autenticación
│       ├── users/             # Usuarios
│       ├── roles/             # Roles
│       ├── sedes/             # Sedes
│       ├── oficinas/          # Oficinas
│       └── bodegas/           # Bodegas
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## 🔒 Seguridad

- JWT tokens con expiración
- Bcrypt para contraseñas (10 rounds)
- Guards para protección de rutas
- Helmet para headers de seguridad
- Rate limiting
- CORS configurado
- Validación de entrada

## 📞 Soporte

Para más información, consulta:
- Documentación Swagger: `/api/docs`
- Logs: `logs/` directory

---

**Desarrollado con NestJS** 🚀
