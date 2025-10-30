# 🛣️ API Routes - Estudio Backend

## URL Base
```
http://localhost:3000/api/v1
```

---

## 📋 Tabla de Contenidos

1. [Autenticación](#autenticación)
2. [Usuarios](#usuarios)
3. [Roles](#roles)
4. [Geografía](#geografía)
5. [Materiales e Inventario](#materiales-e-inventario)
6. [Movimientos](#movimientos)
7. [Traslados](#traslados)
8. [Instalaciones](#instalaciones)
9. [Clientes](#clientes)
10. [Proyectos](#proyectos)
11. [Chat](#chat)
12. [Estados de Usuario](#estados-de-usuario)

---

## Autenticación

### POST `/auth/login`
Login de usuario

**Body:**
```json
{
  "email": "admin@estudio.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "user": {
    "usuarioId": 1,
    "usuarioCorreo": "admin@estudio.com",
    "rolTipo": "admin"
  }
}
```

---

## Usuarios

### POST `/users`
Crear nuevo usuario (Admin/SuperAdmin)

### GET `/users`
Listar todos los usuarios (Admin/SuperAdmin)

### GET `/users/:id`
Obtener usuario por ID (Admin/SuperAdmin)

### PATCH `/users/:id`
Actualizar usuario (Admin/SuperAdmin)

### PATCH `/users/:id/estado`
Actualizar estado de usuario (Admin/SuperAdmin)

### POST `/users/:id/change-role`
Cambiar rol de usuario (SuperAdmin)

### DELETE `/users/:id`
Eliminar usuario (SuperAdmin)

---

## Roles

### POST `/roles`
Crear nuevo rol (SuperAdmin)

### GET `/roles`
Listar todos los roles

### GET `/roles/:id`
Obtener rol por ID

### PATCH `/roles/:id`
Actualizar rol (SuperAdmin)

### DELETE `/roles/:id`
Eliminar rol (SuperAdmin)

---

## Geografía

### Países

- `POST /paises` - Crear país
- `GET /paises` - Listar países
- `GET /paises/:id` - Obtener país por ID
- `PATCH /paises/:id` - Actualizar país
- `DELETE /paises/:id` - Eliminar país

### Departamentos

- `POST /departamentos` - Crear departamento
- `GET /departamentos` - Listar departamentos
- `GET /departamentos/:id` - Obtener departamento por ID
- `GET /departamentos/:id/municipios` - Obtener municipios del departamento
- `PATCH /departamentos/:id` - Actualizar departamento
- `DELETE /departamentos/:id` - Eliminar departamento

### Municipios

- `POST /municipios` - Crear municipio
- `GET /municipios` - Listar municipios
- `GET /municipios/:id` - Obtener municipio por ID
- `PATCH /municipios/:id` - Actualizar municipio
- `DELETE /municipios/:id` - Eliminar municipio

### Sedes

- `POST /sedes` - Crear sede (Admin/SuperAdmin)
- `GET /sedes` - Listar sedes (Admin/SuperAdmin)
- `GET /sedes/:id` - Obtener sede por ID (Admin/SuperAdmin)
- `PATCH /sedes/:id` - Actualizar sede (Admin/SuperAdmin)
- `DELETE /sedes/:id` - Eliminar sede (Admin/SuperAdmin)

### Oficinas

- `POST /oficinas` - Crear oficina (Admin/SuperAdmin)
- `GET /oficinas` - Listar oficinas (Admin/SuperAdmin)
- `GET /oficinas/:id` - Obtener oficina por ID (Admin/SuperAdmin)
- `PATCH /oficinas/:id` - Actualizar oficina (Admin/SuperAdmin)
- `DELETE /oficinas/:id` - Eliminar oficina (Admin/SuperAdmin)

### Bodegas

- `POST /bodegas` - Crear bodega (Admin/SuperAdmin)
- `GET /bodegas` - Listar bodegas (SuperAdmin/Admin/Bodega)
- `GET /bodegas/:id` - Obtener bodega por ID (Admin/SuperAdmin)
- `PATCH /bodegas/:id` - Actualizar bodega (Admin/SuperAdmin)
- `DELETE /bodegas/:id` - Eliminar bodega (Admin/SuperAdmin)

---

## Materiales e Inventario

### Categorías

- `POST /categorias` - Crear categoría (SuperAdmin/Admin/Inventario)
- `GET /categorias` - Listar categorías raíz
- `GET /categorias/:id` - Obtener categoría por ID
- `GET /categorias/:id/subcategorias` - Obtener subcategorías
- `PATCH /categorias/:id` - Actualizar categoría
- `DELETE /categorias/:id` - Eliminar categoría

### Proveedores

- `POST /proveedores` - Crear proveedor (SuperAdmin/Admin/Inventario)
- `GET /proveedores` - Listar proveedores
- `GET /proveedores/:id` - Obtener proveedor por ID
- `PATCH /proveedores/:id` - Actualizar proveedor
- `DELETE /proveedores/:id` - Eliminar proveedor

### Inventarios

- `POST /inventarios` - Crear inventario (SuperAdmin/Admin/Inventario)
- `GET /inventarios` - Listar inventarios
- `GET /inventarios/:id` - Obtener inventario por ID
- `PATCH /inventarios/:id` - Actualizar inventario
- `DELETE /inventarios/:id` - Eliminar inventario

### Materiales

- `POST /materiales` - Crear material (SuperAdmin/Admin/Inventario)
- `GET /materiales` - Listar materiales (SuperAdmin/Admin/Técnico/Bodega/Inventario)
- `GET /materiales/:id` - Obtener material por ID
- `PATCH /materiales/:id` - Actualizar material
- `POST /materiales/:id/ajustar-stock` - Ajustar stock manualmente
- `DELETE /materiales/:id` - Eliminar material

---

## Movimientos

- `POST /movimientos` - Crear movimiento (SuperAdmin/Admin/Técnico/Entradas/Salidas/Devoluciones)
- `GET /movimientos` - Listar movimientos
- `GET /movimientos/:id` - Obtener movimiento por ID
- `GET /movimientos/material/:materialId` - Movimientos de un material
- `GET /movimientos/instalacion/:instalacionId` - Movimientos de una instalación

**Tipos de movimientos:**
- `entrada` - Entrada de material al inventario
- `salida` - Salida de material del inventario
- `devolucion` - Devolución de material

---

## Traslados

- `POST /traslados` - Crear traslado entre bodegas
- `GET /traslados` - Listar traslados
- `GET /traslados/:id` - Obtener traslado por ID
- `POST /traslados/:id/completar` - Completar traslado
- `DELETE /traslados/:id` - Cancelar traslado

---

## Instalaciones

- `POST /instalaciones` - Crear instalación
- `GET /instalaciones` - Listar instalaciones
- `GET /instalaciones/:id` - Obtener instalación por ID
- `PATCH /instalaciones/:id` - Actualizar instalación
- `DELETE /instalaciones/:id` - Eliminar instalación

### Asignaciones de Usuarios

- `POST /instalaciones-usuarios/:instalacionId/asignar` - Asignar usuarios a instalación
- `GET /instalaciones-usuarios/instalacion/:instalacionId` - Ver usuarios asignados
- `DELETE /instalaciones-usuarios/:id` - Remover asignación

### Tipos de Instalación

- `POST /tipos-instalacion` - Crear tipo de instalación
- `GET /tipos-instalacion` - Listar tipos de instalación
- `GET /tipos-instalacion/:id` - Obtener tipo por ID
- `PATCH /tipos-instalacion/:id` - Actualizar tipo
- `DELETE /tipos-instalacion/:id` - Eliminar tipo

---

## Clientes

- `POST /clientes` - Crear cliente
- `GET /clientes` - Listar clientes
- `GET /clientes/:id` - Obtener cliente por ID
- `PATCH /clientes/:id` - Actualizar cliente
- `DELETE /clientes/:id` - Eliminar cliente

---

## Proyectos

- `POST /proyectos` - Crear proyecto
- `GET /proyectos` - Listar proyectos
- `GET /proyectos/:id` - Obtener proyecto por ID
- `PATCH /proyectos/:id` - Actualizar proyecto
- `DELETE /proyectos/:id` - Eliminar proyecto

### Items de Proyecto

- `POST /items-proyecto` - Agregar item a proyecto
- `GET /items-proyecto` - Listar items de proyecto
- `GET /items-proyecto/:id` - Obtener item por ID
- `GET /items-proyecto/proyecto/:proyectoId` - Items de un proyecto
- `PATCH /items-proyecto/:id` - Actualizar item
- `DELETE /items-proyecto/:id` - Eliminar item

### Tipos de Proyecto

- `POST /tipos-proyecto` - Crear tipo de proyecto
- `GET /tipos-proyecto` - Listar tipos de proyecto
- `GET /tipos-proyecto/:id` - Obtener tipo por ID
- `PATCH /tipos-proyecto/:id` - Actualizar tipo
- `DELETE /tipos-proyecto/:id` - Eliminar tipo

---

## Chat

### Grupos

- `POST /grupos` - Crear grupo
- `GET /grupos` - Listar grupos del usuario
- `GET /grupos/:id` - Obtener grupo por ID
- `GET /grupos/usuario/:usuarioId` - Grupos de un usuario
- `PATCH /grupos/:id` - Actualizar grupo

### Mensajes

- `POST /mensajes/enviar` - Enviar mensaje
- `GET /mensajes/grupo/:grupoId` - Mensajes de un grupo
- `GET /mensajes/:id` - Obtener mensaje por ID
- `DELETE /mensajes/:id` - Eliminar mensaje

### Reacciones

- `POST /reacciones-mensaje/:mensajeId` - Reaccionar a mensaje
- `DELETE /reacciones-mensaje/:mensajeId` - Quitar reacción
- `GET /reacciones-mensaje/:mensajeId` - Ver reacciones de un mensaje

### Usuarios en Grupos

- `POST /usuarios-grupos` - Agregar usuario a grupo
- `GET /usuarios-grupos` - Listar usuarios en grupos
- `DELETE /usuarios-grupos/:id` - Remover usuario de grupo

---

## Estados de Usuario

- `POST /estados-usuario/actualizar` - Actualizar estado
- `GET /estados-usuario/mi-estado` - Ver mi estado actual
- `GET /estados-usuario/usuario/:usuarioId` - Estado de un usuario
- `GET /estados-usuario` - Listar estados de usuarios

**Estados disponibles:**
- `desconectado` - Usuario desconectado
- `conectado` - Usuario en línea
- `ocupado` - Usuario ocupado

---

## 🔐 Control de Acceso por Roles

### SuperAdmin
- Acceso total a todas las rutas

### Admin
- Gestión de usuarios de su oficina
- Gestión de materiales de su oficina
- Acceso a sedes/oficinas/bodegas

### Técnico
- Ver materiales e instalaciones
- Registrar salidas y devoluciones
- Ver y gestionar sus asignaciones

### Bodega
- Ver materiales de su bodega
- Gestión de inventario local

### Roles Funcionales
- **inventario**: Gestión de categorías, proveedores, materiales
- **entradas**: Registrar entradas
- **salidas**: Registrar salidas
- **devoluciones**: Registrar devoluciones
- **traslados**: Gestión de traslados entre bodegas
- **instalaciones**: Gestión de instalaciones

---

## 📝 Notas

- Todas las rutas requieren autenticación excepto `/auth/login`
- Los IDs en las rutas son parámetros dinámicos (ej: `/users/:id`)
- Todos los endpoints devuelven JSON
- Los métodos soportados son: `GET`, `POST`, `PATCH`, `DELETE`
- Consulta Swagger en `http://localhost:3000/api/docs` para documentación interactiva

---

**Total de Endpoints:** ~150+

**Ver documentación interactiva en Swagger:** http://localhost:3000/api/docs 📚

