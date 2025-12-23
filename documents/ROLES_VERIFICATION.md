# Verificación de Roles - Backend y Base de Datos

## Fecha de Verificación
2025-01-XX

## Roles Requeridos (Frontend)
Los siguientes roles deben estar disponibles en el backend y base de datos:
1. `superadmin` - Super Administrador
2. `admin` - Administrador
3. `almacenista` - Almacenista
4. `tecnico` - Técnico
5. `soldador` - Soldador
6. `bodega-internas` - Bodega Internas
7. `bodega-redes` - Bodega Redes

## Estado Actual

### 1. Enum RoleType (Backend)
**Ubicación**: `src/modules/roles/role.entity.ts`

✅ **Roles Principales Definidos**:
- `SUPERADMIN = 'superadmin'` ✅
- `ADMIN = 'admin'` ✅
- `ADMINISTRADOR = 'administrador'` ✅ (Centro Operativo - solo lectura)
- `TECNICO = 'tecnico'` ✅
- `SOLDADOR = 'soldador'` ✅
- `ALMACENISTA = 'almacenista'` ✅
- `BODEGA_INTERNAS = 'bodega-internas'` ✅
- `BODEGA_REDES = 'bodega-redes'` ✅

⚠️ **Roles Legacy (mantener para compatibilidad)**:
- `BODEGA = 'bodega'`
- `EMPLEADO = 'empleado'`
- `INVENTARIO = 'inventario'`
- `TRASLADOS = 'traslados'`
- `DEVOLUCIONES = 'devoluciones'`
- `SALIDAS = 'salidas'`
- `ENTRADAS = 'entradas'`
- `INSTALACIONES = 'instalaciones'`

### 2. Migración SQL
**Ubicación**: `src/migrations/2025-01-XX_add_new_roles.sql`

✅ **Roles Insertados**:
- `administrador` ✅
- `almacenista` ✅
- `bodega-internas` ✅
- `bodega-redes` ✅
- `soldador` ✅

⚠️ **Roles Faltantes en Migración**:
- `superadmin` - Debe estar en `seed_initial_data.sql`
- `admin` - Debe estar en `seed_initial_data.sql`
- `tecnico` - Debe estar en `seed_initial_data.sql`

### 3. Seed Inicial
**Ubicación**: `src/migrations/seed_initial_data.sql`

✅ **Roles Insertados**:
- `superadmin` ✅
- `admin` ✅
- `tecnico` ✅

## Verificación de Consistencia

### Roles en Controladores
Los controladores usan los siguientes roles en `@Roles()`:

**Roles Principales Usados**:
- ✅ `superadmin` - Usado en todos los controladores
- ✅ `admin` - Usado en la mayoría de controladores
- ✅ `administrador` - Usado para endpoints de solo lectura
- ✅ `almacenista` - Usado en movimientos, asignaciones
- ✅ `tecnico` - Usado en instalaciones, movimientos
- ✅ `soldador` - Usado en algunos controladores
- ✅ `bodega-internas` - Usado en instalaciones, proyectos, usuarios
- ✅ `bodega-redes` - Usado en instalaciones, proyectos, usuarios

**Roles Legacy Usados**:
- ⚠️ `bodega` - Aún usado en algunos controladores
- ⚠️ `inventario` - Aún usado en algunos controladores
- ⚠️ `traslados` - Aún usado en algunos controladores
- ⚠️ `entradas`, `salidas`, `devoluciones` - Aún usados en algunos controladores
- ⚠️ `instalaciones` - Aún usado en algunos controladores

## Recomendaciones

### 1. Migración SQL Completa
Crear una migración que asegure que todos los roles principales estén en la base de datos:

```sql
-- Verificar y crear roles principales si no existen
INSERT INTO roles (rolNombre, rolTipo, rolDescripcion, rolEstado, fechaCreacion, fechaActualizacion)
SELECT * FROM (
  SELECT 'Super Administrador', 'superadmin', 'Administrador con todos los permisos incluyendo cambio de roles', 1, NOW(), NOW()
  UNION ALL SELECT 'Administrador', 'admin', 'Administrador de oficina con permisos completos excepto cambio de roles', 1, NOW(), NOW()
  UNION ALL SELECT 'Técnico', 'tecnico', 'Usuario técnico con acceso a aplicación móvil y instalaciones asignadas', 1, NOW(), NOW()
  UNION ALL SELECT 'Administrador - Centro Operativo', 'administrador', 'Usuario con acceso de solo lectura a la información del centro operativo', 1, NOW(), NOW()
  UNION ALL SELECT 'Almacenista', 'almacenista', 'Puede gestionar entradas, salidas, asignaciones, devoluciones y traslados', 1, NOW(), NOW()
  UNION ALL SELECT 'Soldador', 'soldador', 'Rol para personal de campo especializado en soldadura', 1, NOW(), NOW()
  UNION ALL SELECT 'Bodega Internas', 'bodega-internas', 'Puede gestionar instalaciones, proyectos, usuarios y tipos de instalaciones', 1, NOW(), NOW()
  UNION ALL SELECT 'Bodega Redes', 'bodega-redes', 'Puede gestionar instalaciones, proyectos, usuarios y tipos de instalaciones', 1, NOW(), NOW()
) AS new_roles
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE roles.rolTipo = new_roles.rolTipo
);
```

### 2. Limpiar Roles Legacy
Considerar deprecar gradualmente los roles legacy y migrar a los nuevos roles:
- `bodega` → `bodega-internas` o `bodega-redes`
- `inventario` → `almacenista`
- `traslados` → `almacenista`
- `entradas`, `salidas`, `devoluciones` → `almacenista`
- `instalaciones` → `bodega-internas` o `bodega-redes`

### 3. Validación en Backend
Agregar validación en el servicio de usuarios para asegurar que solo se puedan asignar roles válidos:

```typescript
const rolesValidos = ['superadmin', 'admin', 'almacenista', 'tecnico', 'soldador', 'bodega-internas', 'bodega-redes'];
if (!rolesValidos.includes(rolTipo)) {
  throw new BadRequestException('Rol no válido');
}
```

## Acciones Requeridas

- [ ] Crear migración SQL completa que asegure todos los roles principales
- [ ] Verificar que todos los roles estén en la base de datos
- [ ] Actualizar controladores para usar solo roles principales (opcional, mantener legacy para compatibilidad)
- [ ] Agregar validación en backend para roles válidos
- [ ] Documentar proceso de migración de roles legacy

## Notas

- Los roles legacy se mantienen para compatibilidad con datos existentes
- Los nuevos roles deben ser los únicos disponibles en el formulario de creación de usuarios
- El frontend ya filtra correctamente los roles permitidos

