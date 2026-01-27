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

## Roles Legacy (ELIMINADOS)

Los siguientes roles legacy han sido eliminados del sistema. Los usuarios que tenían estos roles fueron migrados a roles principales:

- ~~`bodega` - Encargado de Bodega~~ → Migrado a `bodega-internas` o `bodega-redes`
- ~~`empleado` - Empleado común~~ → Eliminado
- ~~`inventario` - Gestión de inventario~~ → Eliminado
- ~~`traslados` - Gestión de traslados~~ → Eliminado
- ~~`devoluciones` - Gestión de devoluciones~~ → Eliminado
- ~~`salidas` - Gestión de salidas~~ → Eliminado
- ~~`entradas` - Gestión de entradas~~ → Eliminado
- ~~`instalaciones` - Gestión de instalaciones~~ → Eliminado

**Nota**: El enum de la base de datos aún incluye estos valores para compatibilidad histórica, pero no se deben crear nuevos usuarios con estos roles.

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
- ✅ Ejecutar script de corrección de roles: `npm run fix:roles`
- ✅ Ejecutar script para eliminar rol legacy: `npm run delete:encargado-bodega`

## Scripts de Mantenimiento

```bash
# Corregir enum y actualizar roles
npm run fix:roles

# Eliminar rol "Encargado de Bodega" (migra usuarios a Almacenista)
npm run delete:encargado-bodega

# Agregar tipos de documento y roles iniciales
npm run seed:tipos-roles
```

## Notas Importantes

- El enum en la base de datos debe incluir TODOS los roles (principales + legacy) para evitar errores
- Los roles legacy se mantienen para no romper datos existentes
- El frontend filtra correctamente para mostrar solo roles principales
- El backend valida permisos según el rol en los controladores

