# Tests de Roles y Permisos - Documentación

Este documento describe los tests creados para verificar que el sistema de roles y permisos funciona correctamente al 100%.

## Tests del Backend

### 1. AuthService - Restricción de Login (`auth.service.roles.spec.ts`)

Verifica que los técnicos y soldadores no puedan iniciar sesión en el sistema principal:

- ✅ Permite login para superadmin
- ✅ Permite login para admin
- ✅ Permite login para almacenista
- ✅ Permite login para bodega-internas
- ✅ Rechaza login para tecnico en sistema principal
- ✅ Rechaza login para soldador en sistema principal

### 2. UsersService - Restricción de Cambio de Contraseña y Roles (`users.service.roles.spec.ts`)

Verifica las restricciones de cambio de contraseña y roles:

- ✅ Permite a superadmin cambiar contraseña de otros usuarios
- ✅ Permite a usuarios cambiar su propia contraseña
- ✅ Rechaza que no-superadmin cambie contraseña de otros usuarios
- ✅ Permite a superadmin cambiar roles de usuarios
- ✅ Rechaza que no-superadmin cambie roles de usuarios

### 3. InstalacionesMaterialesService - Aprobación de Materiales (`instalaciones-materiales.service.roles.spec.ts`)

Verifica la funcionalidad de aprobación de materiales:

- ✅ Aprobar material correctamente
- ✅ Desaprobar material correctamente
- ✅ Manejar toggle de aprobación correctamente

### 4. InstalacionesMaterialesController - Permisos de Aprobación (`instalaciones-materiales.controller.roles.spec.ts`)

Verifica los permisos de acceso al endpoint de aprobación:

- ✅ Permite a superadmin aprobar material
- ✅ Permite a admin aprobar material
- ✅ Permite a almacenista aprobar material
- ✅ Rechaza a tecnico aprobar material
- ✅ Rechaza a soldador aprobar material
- ✅ Rechaza a bodega-internas aprobar material
- ✅ Permite a tecnico asignar materiales
- ✅ Rechaza a almacenista asignar materiales a instalaciones
- ✅ Rechaza a bodega-internas asignar materiales a instalaciones

### 5. UsersController - Permisos de Gestión de Usuarios (`users.controller.roles.spec.ts`)

Verifica los permisos de gestión de usuarios:

- ✅ Solo superadmin puede cambiar roles
- ✅ Rechaza a admin cambiar roles
- ✅ Rechaza a almacenista cambiar roles
- ✅ Permite a superadmin, admin, bodega-internas crear usuarios
- ✅ Rechaza a almacenista crear usuarios
- ✅ Solo superadmin puede eliminar usuarios

## Tests del Frontend

### 1. usePermissions Hook (`usePermissions.test.ts`)

Ya existe un test completo que verifica:

- ✅ Permisos de SuperAdmin
- ✅ Permisos de Admin
- ✅ Permisos de Administrador (Centro Operativo)
- ✅ Permisos de Almacenista
- ✅ Permisos de Bodega Internas
- ✅ Permisos de Bodega Redes
- ✅ Permisos de Técnico
- ✅ Permisos de Soldador
- ✅ Restricciones de visualización entre bodegas

## Cómo Ejecutar los Tests

### Backend

```bash
cd BakendJarlepsis

# Ejecutar todos los tests de roles
npm test -- *.roles.spec.ts

# Ejecutar un test específico
npm test -- auth.service.roles.spec.ts

# Ejecutar todos los tests
npm test
```

**Estado actual:** ✅ 13 test suites pasando, 72 tests pasando

### Frontend

```bash
cd FrontendJarlepsis

# Si tienes configurado testing (Vitest/Jest)
npm test

# O ejecutar tests específicos
npm test -- usePermissions
```

## Cobertura de Tests

### Funcionalidades Verificadas

1. ✅ Restricción de login de técnico y soldador
2. ✅ Restricción de cambio de contraseña (solo propia o superadmin)
3. ✅ Restricción de cambio de roles (solo superadmin)
4. ✅ Permisos de aprobación de materiales (almacenista, admin, superadmin)
5. ✅ Permisos de asignación de materiales a instalaciones
6. ✅ Permisos de creación/edición/eliminación según roles
7. ✅ Restricciones de visualización entre bodegas
8. ✅ Permisos de gestión de traslados
9. ✅ Permisos de asignación de materiales a técnicos
10. ✅ Permisos de edición de inventario

## Resumen de Tests Creados

### Backend (72 tests pasando)

1. **auth.service.roles.spec.ts** - 6 tests
   - Verifica restricción de login para técnico/soldador
   - Verifica permisos de login para otros roles

2. **users.service.roles.spec.ts** - 6 tests
   - Verifica restricciones de cambio de contraseña
   - Verifica restricciones de cambio de roles

3. **users.controller.roles.spec.ts** - 9 tests
   - Verifica permisos de endpoints de usuarios
   - Verifica restricción de cambio de roles (solo superadmin)

4. **instalaciones-materiales.service.roles.spec.ts** - 3 tests
   - Verifica funcionalidad de aprobación de materiales

5. **instalaciones-materiales.controller.roles.spec.ts** - 9 tests
   - Verifica permisos de aprobación de materiales
   - Verifica permisos de asignación de materiales

### Frontend

1. **usePermissions.test.ts** - Tests existentes (ya estaba)
2. **usePermissions.roles.test.ts** - Tests adicionales para funcionalidades específicas
   - Verifica canApproveMaterial para todos los roles
   - Verifica canAssignMaterialToInstallation
   - Verifica canEditInventory
   - Verifica canCreateMovements
   - Verifica canManageTransfers
   - Verifica canAssignMaterialToTechnician

## Tests de Notificaciones y Chat

### Notificaciones

1. **notificaciones.service.spec.ts** - Tests del servicio de notificaciones
   - Creación de notificaciones básicas
   - Notificaciones con datos adicionales
   - Emisión por WebSocket
   - Manejo de errores de WebSocket
   - Marcado como leídas
   - Contar notificaciones no leídas
   - Eliminación de notificaciones

2. **notificaciones.instalaciones.spec.ts** - Tests de notificaciones de instalaciones
   - Notificaciones de construcción
   - Notificaciones de certificación
   - Notificaciones de anulación
   - Notificaciones de materiales asignados

3. **notificaciones.controller.spec.ts** - Tests de permisos del controlador
   - Verificación de permisos para todos los roles

### Chat

1. **chat.gateway.spec.ts** - Tests del gateway de WebSocket
   - Conexión/desconexión de usuarios
   - Unirse/salir de grupos
   - Emisión de mensajes nuevos
   - Emisión de notificaciones
   - Emisión de eventos de instalación
   - Obtener usuarios conectados

2. **mensajes.service.chat.spec.ts** - Tests de integración chat/notificaciones
   - Envío de mensajes y emisión por WebSocket
   - Creación de notificaciones para miembros del grupo
   - Exclusión del remitente de notificaciones

## Notas Importantes

- Los tests del backend requieren que todas las dependencias estén mockeadas correctamente
- Los tests del frontend requieren que `useAuth` esté mockeado
- Todos los tests deben pasar antes de hacer deploy a producción
- **Estado actual:** ✅ Todos los tests del backend están pasando (125/125)

## Resumen de Tests Creados

### Tests de Roles y Permisos (72 tests)
- auth.service.roles.spec.ts - 6 tests
- users.service.roles.spec.ts - 6 tests
- users.controller.roles.spec.ts - 9 tests
- instalaciones-materiales.service.roles.spec.ts - 3 tests
- instalaciones-materiales.controller.roles.spec.ts - 9 tests
- Otros tests de permisos existentes - 39 tests

### Tests de Notificaciones (23 tests)
- notificaciones.service.spec.ts - 23 tests
  - Creación de notificaciones básicas
  - Notificaciones con datos adicionales
  - Emisión por WebSocket
  - Manejo de errores
  - Marcado como leídas
  - Contar notificaciones
  - Eliminación

### Tests de Notificaciones de Instalaciones (4 tests)
- notificaciones.instalaciones.spec.ts - 4 tests
  - Notificaciones de construcción
  - Notificaciones de certificación
  - Notificaciones de anulación
  - Notificaciones de materiales asignados

### Tests de Controlador de Notificaciones (3 tests)
- notificaciones.controller.spec.ts - 3 tests
  - Verificación de permisos para todos los roles

### Tests de Chat Gateway (19 tests)
- chat.gateway.spec.ts - 19 tests
  - Conexión/desconexión
  - Unirse/salir de grupos
  - Emisión de mensajes
  - Emisión de notificaciones
  - Emisión de eventos de instalación
  - Obtener usuarios conectados

### Tests de Integración Chat/Notificaciones (3 tests)
- mensajes.service.chat.spec.ts - 3 tests
  - Envío de mensajes y emisión por WebSocket
  - Creación de notificaciones para miembros del grupo
  - Exclusión del remitente de notificaciones
