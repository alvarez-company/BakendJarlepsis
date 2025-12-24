# Resumen de Tests de Permisos - Sistema Jarlepsis

## Tests Creados

### Backend

#### 1. `roles.guard.spec.ts`
**Ubicación**: `src/common/guards/roles.guard.spec.ts`

**Cobertura**:
- ✅ Permite acceso cuando no hay roles requeridos
- ✅ Permite acceso cuando el rol del usuario coincide con los roles requeridos (superadmin, almacenista, bodega-internas)
- ✅ Deniega acceso cuando el rol del usuario no coincide
- ✅ Funciona con fallback `user.role`
- ✅ Deniega acceso cuando el usuario no tiene rol
- ✅ Maneja correctamente el rol `administrador`
- ✅ Maneja correctamente el rol `soldador`

**Estado**: ✅ Todos los tests pasan (9/9)

#### 2. `instalaciones.service.permissions.spec.ts`
**Ubicación**: `src/modules/instalaciones/instalaciones.service.permissions.spec.ts`

**Cobertura**:
- ✅ Permite a superadmin actualizar instalaciones
- ✅ Permite a bodega-internas actualizar instalaciones
- ✅ Permite a bodega-redes actualizar instalaciones
- ✅ Deniega a almacenista actualizar instalaciones
- ✅ Deniega a administrador actualizar instalaciones
- ✅ Permite a superadmin eliminar instalaciones
- ✅ Permite a bodega-internas eliminar instalaciones
- ✅ Deniega a almacenista eliminar instalaciones
- ✅ Permite a superadmin cambiar estado de instalaciones
- ✅ Deniega a almacenista cambiar estado de instalaciones

**Estado**: ⚠️ Requiere dependencias mockeadas (UsersService, MovimientosService, etc.)

#### 3. `asignaciones-tecnicos.service.permissions.spec.ts`
**Ubicación**: `src/modules/asignaciones-tecnicos/asignaciones-tecnicos.service.permissions.spec.ts`

**Cobertura**:
- ✅ Permite a superadmin crear asignaciones
- ✅ Permite a admin crear asignaciones
- ✅ Permite a almacenista crear asignaciones
- ✅ Deniega a bodega-internas crear asignaciones
- ✅ Deniega a bodega-redes crear asignaciones
- ✅ Funciona con fallback `user.role`

**Estado**: ⚠️ Requiere dependencias mockeadas (UsersService, MaterialesService, etc.)

### Frontend

#### 4. `usePermissions.test.ts`
**Ubicación**: `src/hooks/__tests__/usePermissions.test.ts`

**Cobertura**:
- ✅ Permisos de SuperAdmin (todos los permisos)
- ✅ Permisos de Admin (oficina - permisos completos)
- ✅ Permisos de Administrador (Centro Operativo - solo lectura)
- ✅ Permisos de Almacenista (movimientos + ver instalaciones + aprobar material)
- ✅ Permisos de Bodega Internas (completo excepto asignar material)
- ✅ Permisos de Bodega Redes (completo excepto asignar material)
- ✅ Permisos de Técnico (solo visualización)
- ✅ Permisos de Soldador (solo visualización)
- ✅ Filtrado cruzado de información de bodegas
- ✅ Obtención del tipo de bodega del usuario

**Estado**: ✅ Tests creados (requiere configuración de testing library)

## Correcciones Realizadas

### 1. Hook `usePermissions` del Frontend
- ✅ Agregado soporte para rol `admin` (además de `administrador`)
- ✅ Agregados métodos helper: `canEditCentroOperativo`, `canDeleteCentroOperativo`, `canCreateCentroOperativo`
- ✅ Agregadas propiedades `isAdmin` y otras flags de roles

### 2. Documentación
- ✅ Creado documento `PERMISSIONS_REVIEW.md` con matriz completa de permisos
- ✅ Documentadas inconsistencias encontradas
- ✅ Documentadas recomendaciones

## Inconsistencias Identificadas

### 1. Confusión entre `admin` y `administrador`
- **Estado**: ✅ Corregido - Frontend ahora soporta ambos roles
- **Nota**: `admin` es administrador de oficina (permisos completos), `administrador` es Centro Operativo (solo lectura)

### 2. Filtrado de Bodegas Internas y Bodega Redes
- **Estado**: ⚠️ Pendiente - Actualmente se filtra por `usuarioSede`
- **Recomendación**: Agregar campo `bodegaTipo` a la entidad `Bodega` para filtrado más preciso

### 3. Validaciones en Servicios
- **Estado**: ✅ Implementado en `InstalacionesService` y `AsignacionesTecnicosService`
- **Pendiente**: Agregar validaciones en otros servicios críticos

## Próximos Pasos

1. ✅ Completar mocks en tests de servicios para que puedan ejecutarse
2. ⚠️ Implementar filtrado por tipo de bodega para evitar cruce de información
3. ⚠️ Agregar validaciones de permisos en más servicios
4. ⚠️ Crear tests de integración para verificar permisos end-to-end
5. ⚠️ Agregar tests para protección de rutas en frontend

## Ejecutar Tests

### Backend
```bash
cd BakendJarlepsis
npm test -- roles.guard.spec.ts
npm test -- instalaciones.service.permissions.spec.ts
npm test -- asignaciones-tecnicos.service.permissions.spec.ts
```

### Frontend
```bash
cd FrontendJarlepsis
npm test -- usePermissions.test.ts
```

## Notas

- Los tests de servicios requieren mocks completos de dependencias
- Los tests del frontend requieren configuración de `@testing-library/react`
- Se recomienda ejecutar los tests antes de cada deploy

