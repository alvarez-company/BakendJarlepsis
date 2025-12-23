# Revisión de Permisos y Roles - Sistema Jarlepsis

## Fecha de Revisión
2025-01-XX

## Roles Definidos

### Backend (role.entity.ts)
1. **SUPERADMIN** (`superadmin`) - Acceso completo al sistema
2. **ADMIN** (`admin`) - Administrador de oficina (permisos completos excepto cambio de roles)
3. **ADMINISTRADOR** (`administrador`) - Administrador Centro Operativo (solo lectura)
4. **ALMACENISTA** (`almacenista`) - Gestión de movimientos de inventario
5. **BODEGA_INTERNAS** (`bodega-internas`) - Gestión de bodegas internas
6. **BODEGA_REDES** (`bodega-redes`) - Gestión de bodegas de redes
7. **TECNICO** (`tecnico`) - Técnico de instalaciones
8. **SOLDADOR** (`soldador`) - Soldador especializado

### Frontend (usePermissions.ts)
- `superadmin` - Acceso completo
- `administrador` - Solo visualización
- `almacenista` - Movimientos + ver instalaciones + aprobar material
- `bodega-internas` - Gestión completa excepto asignar material
- `bodega-redes` - Gestión completa excepto asignar material
- `tecnico` - Ver instalaciones asignadas
- `soldador` - Ver instalaciones asignadas

## Matriz de Permisos

### Sedes (Centros Operativos)
| Acción | SuperAdmin | Admin | Administrador | Almacenista | Bodega Internas | Bodega Redes | Técnico | Soldador |
|--------|------------|-------|---------------|-------------|-----------------|--------------|---------|----------|
| Ver todas | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ver propia | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Crear | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Editar | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Instalaciones
| Acción | SuperAdmin | Admin | Administrador | Almacenista | Bodega Internas | Bodega Redes | Técnico | Soldador |
|--------|------------|-------|---------------|-------------|-----------------|--------------|---------|----------|
| Ver todas | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver asignadas | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Crear | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Editar | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Cambiar estado | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Aprobar material | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

### Movimientos (Entradas, Salidas, Devoluciones, Traslados)
| Acción | SuperAdmin | Admin | Administrador | Almacenista | Bodega Internas | Bodega Redes | Técnico | Soldador |
|--------|------------|-------|---------------|-------------|-----------------|--------------|---------|----------|
| Ver | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Crear | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Editar | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Eliminar | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

### Asignaciones de Materiales
| Acción | SuperAdmin | Admin | Administrador | Almacenista | Bodega Internas | Bodega Redes | Técnico | Soldador |
|--------|------------|-------|---------------|-------------|-----------------|--------------|---------|----------|
| Ver | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Crear | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Aprobar | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Rechazar | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Eliminar | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

### Proyectos
| Acción | SuperAdmin | Admin | Administrador | Almacenista | Bodega Internas | Bodega Redes | Técnico | Soldador |
|--------|------------|-------|---------------|-------------|-----------------|--------------|---------|----------|
| Ver | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Crear | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Editar | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |

### Usuarios
| Acción | SuperAdmin | Admin | Administrador | Almacenista | Bodega Internas | Bodega Redes | Técnico | Soldador |
|--------|------------|-------|---------------|-------------|-----------------|--------------|---------|----------|
| Ver | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Crear | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Editar | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Cambiar rol | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Tipos de Instalación
| Acción | SuperAdmin | Admin | Administrador | Almacenista | Bodega Internas | Bodega Redes | Técnico | Soldador |
|--------|------------|-------|---------------|-------------|-----------------|--------------|---------|----------|
| Ver | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Crear | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Editar | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |

## Inconsistencias Encontradas

### 1. Confusión entre `admin` y `administrador`
- **Backend**: Existen dos roles diferentes:
  - `admin` - Administrador de oficina (permisos completos)
  - `administrador` - Administrador Centro Operativo (solo lectura)
- **Frontend**: Solo se define `administrador` en `usePermissions.ts`
- **Impacto**: Los usuarios con rol `admin` pueden no tener permisos correctos en el frontend
- **Solución**: Verificar si `admin` debe mantenerse o si todos deben ser `administrador`

### 2. Filtrado de Bodegas Internas y Bodega Redes
- **Requerimiento**: La información de estas dos bodegas no se puede cruzar
- **Implementación actual**: Se filtra por `usuarioSede` en `bodegas.service.ts`
- **Problema**: Si ambas bodegas están en la misma sede, pueden verse entre sí
- **Solución sugerida**: Agregar campo `bodegaTipo` a la entidad `Bodega` y filtrar por tipo

### 3. Validaciones en Servicios
- Algunos servicios tienen validaciones de permisos, otros no
- **Servicios con validaciones**:
  - `instalaciones.service.ts` ✅
  - `asignaciones-tecnicos.service.ts` ✅
- **Servicios sin validaciones**:
  - `sedes.service.ts` (solo filtrado, no validación de acciones)
  - `bodegas.service.ts` (solo filtrado, no validación de acciones)

### 4. Roles en Controladores
- Algunos controladores usan `'admin'` y otros `'administrador'`
- Necesita estandarización

## Recomendaciones

1. **Estandarizar roles**: Decidir si mantener `admin` y `administrador` o unificar
2. **Implementar filtrado por tipo de bodega**: Para evitar cruce de información entre Bodega Internas y Bodega Redes
3. **Agregar validaciones en servicios**: Para operaciones críticas (editar, eliminar)
4. **Crear tests unitarios**: Para verificar que los permisos funcionan correctamente
5. **Documentar cambios**: Mantener este documento actualizado con cambios futuros

## Tests Requeridos

### Backend
- [ ] Test de `RolesGuard` con diferentes roles
- [ ] Test de permisos en `InstalacionesService`
- [ ] Test de permisos en `AsignacionesTecnicosService`
- [ ] Test de filtrado en `SedesService`
- [ ] Test de filtrado en `BodegasService`

### Frontend
- [ ] Test de `usePermissions` hook
- [ ] Test de renderizado condicional en componentes
- [ ] Test de protección de rutas

