# Resumen de Roles - Sistema Completo

## Roles Principales (Frontend y Backend)

Los siguientes roles están definidos y deben estar disponibles en el sistema:

### 1. SuperAdmin (`superadmin`)
- **Descripción**: Acceso completo al sistema
- **Permisos**: Todos los permisos, incluyendo cambio de roles
- **Centro Operativo**: No requiere
- **Bodega**: No requiere

### 2. Admin (`admin`)
- **Descripción**: Administrador de oficina
- **Permisos**: Permisos completos excepto cambio de roles
- **Centro Operativo**: Requerido
- **Bodega**: No requiere

### 3. Administrador - Centro Operativo (`administrador`)
- **Descripción**: Solo lectura en el centro operativo
- **Permisos**: Solo visualización, no puede editar ni eliminar
- **Centro Operativo**: Requerido
- **Bodega**: No requiere

### 4. Almacenista (`almacenista`)
- **Descripción**: Gestión de movimientos de inventario
- **Permisos**: 
  - Entradas, Salidas, Asignaciones, Devoluciones, Traslados
  - Ver instalaciones
  - Aprobar material
  - NO puede editar, eliminar ni cambiar estado de instalaciones
- **Centro Operativo**: Requerido
- **Bodega**: No requiere

### 5. Técnico (`tecnico`)
- **Descripción**: Personal de campo
- **Permisos**: Ver instalaciones asignadas, registrar materiales
- **Centro Operativo**: Requerido
- **Bodega**: No requiere

### 6. Soldador (`soldador`)
- **Descripción**: Personal de campo especializado en soldadura
- **Permisos**: Similar a técnico
- **Centro Operativo**: Requerido
- **Bodega**: No requiere

### 7. Bodega Internas (`bodega-internas`)
- **Descripción**: Gestión de bodegas internas
- **Permisos**: 
  - Asignar instalaciones
  - Gestionar proyectos, usuarios, tipos de instalaciones
  - NO puede asignar material
  - La información NO se cruza con Bodega Redes
- **Centro Operativo**: No requiere
- **Bodega**: Requerido

### 8. Bodega Redes (`bodega-redes`)
- **Descripción**: Gestión de bodegas de redes
- **Permisos**: 
  - Asignar instalaciones
  - Gestionar proyectos, usuarios, tipos de instalaciones
  - NO puede asignar material
  - La información NO se cruza con Bodega Internas
- **Centro Operativo**: No requiere
- **Bodega**: Requerido

## Roles Legacy (Mantenidos para compatibilidad)

Estos roles se mantienen para compatibilidad con datos existentes, pero NO deben usarse en nuevos usuarios:

- `bodega` - Encargado de Bodega (legacy)
- `empleado` - Empleado común (legacy)
- `inventario` - Gestión de inventario (legacy)
- `traslados` - Gestión de traslados (legacy)
- `devoluciones` - Gestión de devoluciones (legacy)
- `salidas` - Gestión de salidas (legacy)
- `entradas` - Gestión de entradas (legacy)
- `instalaciones` - Gestión de instalaciones (legacy)

## Verificación de Consistencia

### Backend
- ✅ Enum `RoleType` incluye todos los roles principales
- ✅ Migración SQL para actualizar enum de base de datos
- ✅ Migración SQL para asegurar todos los roles en BD
- ✅ Controladores usan los roles correctos

### Frontend
- ✅ Filtrado de roles en formulario de usuarios
- ✅ Lógica condicional de campos según rol
- ✅ Validaciones según rol

### Base de Datos
- ⚠️ **ACCIÓN REQUERIDA**: Ejecutar migraciones SQL:
  1. `2025-01-XX_update_rolTipo_enum.sql` - Actualiza el enum
  2. `2025-01-XX_ensure_all_roles.sql` - Asegura todos los roles
  3. `2025-01-XX_add_new_roles.sql` - Agrega nuevos roles (si no se ejecutó)

## Orden de Ejecución de Migraciones

1. `2025-01-XX_update_rolTipo_enum.sql` - Primero actualizar el enum
2. `2025-01-XX_ensure_all_roles.sql` - Luego asegurar que todos los roles existan
3. `2025-01-XX_add_new_roles.sql` - Finalmente agregar nuevos roles (si es necesario)

## Notas Importantes

- El enum en la base de datos debe incluir TODOS los roles (principales + legacy) para evitar errores
- Los roles legacy se mantienen para no romper datos existentes
- El frontend filtra correctamente para mostrar solo roles principales
- El backend valida permisos según el rol en los controladores

