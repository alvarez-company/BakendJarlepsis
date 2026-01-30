# Seed y reseteo de base de datos

**Limpieza realizada**: se eliminaron scripts one-off (add-missing-columns, fix-bodegas, fix-roles, delete-encargado-bodega, add-certificados, run-*-migration, etc.) y migraciones SQL legacy que no usa el seed. El esquema queda en las migraciones TypeORM (.ts) y en `full_seed.sql`.

Seeds disponibles:

- **`npm run seed`** → `scripts/seed-full.js`: seed completo (roles, tipos doc, Colombia, estados, unidades, auditoría, clasificaciones, numeros_medidor, tipos instalación/proyecto, categorías, usuario superadmin).
- **`npm run seed:superadmin`** → `scripts/seed-superadmin.js`: solo crea o actualiza el usuario superadmin (requiere que ya existan los roles, p. ej. tras `npm run seed`).
- **`npm run seed:auditoria`** → `scripts/seed-auditoria.js`: solo crea las tablas de auditoría (`auditoria_eliminaciones`, `auditoria_inventario`), `clasificaciones` y `numeros_medidor`. Útil si falla el seed completo (ej. por Colombia) y necesitas poder crear materiales/medidores.

El equivalente en SQL para ejecutar directamente en MySQL es **`src/migrations/full_seed.sql`** (ejecutar después de las migraciones).

---

## Seed completo (`scripts/seed-full.js`)

Deja la base de datos funcional después de ejecutar las migraciones. Incluye todas las tablas de catálogo y de auditoría necesarias.

### Qué incluye

1. **Roles** (10): Super Administrador, Administrador, Administrador - Centro Operativo, Administrador de Internas, Administrador de Redes, Técnico, Soldador, Almacenista, Bodega Internas, Bodega Redes.
2. **Tipos de documento**: tabla `tipos_documentos_identidad` (si no existe) y datos: CC, CE, NUIP, SIC, CI, CS.
3. **Colombia**: país, departamentos y municipios (Santander y Norte de Santander) desde `src/migrations/seed_colombia.sql`.
4. **Estados**: tablas y datos desde `2025-01-XX_create_estados_tables.sql`:
   - `estados_instalacion` (pendiente, asignación, construccion, certificacion, completada, etc.)
   - `estados_cliente` (activo, instalacion_asignada, realizando_instalacion)
   - `estados_movimiento` (pendiente, completada, cancelada)
   - `estados_traslado` (pendiente, en_transito, completado, cancelado)
5. **Unidades de medida**: tabla `unidades_medida` (si no existe) y datos: Unidad, Kilogramo, Gramo, Litro, Metro, Caja, Paquete.
6. **Tablas de auditoría** (solo estructura, sin datos iniciales):
   - `auditoria_eliminaciones`: registro de eliminaciones (movimiento, instalacion, traslado, asignacion).
   - `auditoria_inventario`: registro de cambios en inventario.
7. **Clasificaciones**: tabla `clasificaciones` (desde `2025-11-19_create_clasificaciones.sql`).
8. **Numeros medidor**: tabla `numeros_medidor` (desde `2025-01-XX_create_numeros_medidor_table.sql`).
9. **Tipos de instalación**: Instalación Nueva, Reconexión, Cambio de Medidor, Reparación.
10. **Tipos de proyecto**: Residencial, Comercial, Industrial.
11. **Categorías**: Medidores, Accesorios, Herramientas y subcategorías de medidores.
12. **Usuario superadmin**: creado/actualizado con las variables de entorno (o valores por defecto).

### Uso

```bash
# Requiere: migraciones ya ejecutadas (tablas creadas)
npm run seed
```

Variables de entorno opcionales (`.env`):

- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`
- `ADMIN_EMAIL` (default: admin@jarlepsis.com)
- `ADMIN_PASSWORD` (default: Admin123)
- `ADMIN_NOMBRE`, `ADMIN_APELLIDO`, `ADMIN_DOCUMENTO`

### Reseteo completo

```bash
# Borra la BD, la crea de nuevo, ejecuta migraciones y luego el seed único
npm run db:reset

# Sin confirmación (para scripts/CI)
npm run db:reset:yes
```

Flujo de `db:reset`:

1. Elimina la base de datos.
2. Crea la base de datos.
3. Ejecuta migraciones TypeORM (`npm run migration:run`).
4. Ejecuta el seed único (`npm run seed` → `seed-full.js`).

Con eso la base queda lista para usar (roles, datos de Colombia, categorías, tipos y usuario superadmin).

---

## Ejecución directa desde la base de datos (`full_seed.sql`)

Si prefieres ejecutar el seed directamente en MySQL (por ejemplo desde MySQL Workbench o línea de comandos), usa el archivo:

**`src/migrations/full_seed.sql`**

### Contenido

- **Parte 1**: Creación de tablas auxiliares (`CREATE TABLE IF NOT EXISTS`):  
  `tipos_documentos_identidad`, `estados_instalacion`, `estados_cliente`, `estados_movimiento`, `estados_traslado`, `unidades_medida`, `auditoria_eliminaciones`, `auditoria_inventario`, `clasificaciones`, `numeros_medidor`.
- **Parte 2**: Datos iniciales (roles, tipos de documento, Colombia resumido, estados, unidades de medida, tipos de instalación/proyecto, categorías, usuario superadmin).

### Requisito

Debes haber ejecutado antes las **migraciones TypeORM** (`npm run migration:run`), ya que el esquema principal (usuarios, bodegas, materiales, etc.) se crea con las migraciones. Este archivo solo crea las tablas auxiliares y los datos iniciales.

### Uso

```bash
# 1. Migraciones (desde la raíz del backend)
npm run migration:run

# 2. Ejecutar el SQL (ajusta usuario, contraseña y nombre de BD)
mysql -u root -p jarlepsisdev < src/migrations/full_seed.sql
```

O desde MySQL Workbench: abrir `src/migrations/full_seed.sql` y ejecutarlo contra la base de datos ya creada por las migraciones.

### Nota sobre el superadmin

El usuario superadmin insertado por el SQL tiene por defecto contraseña **"password"** (solo desarrollo). Para usar **Admin123** u otra contraseña segura, ejecuta después `npm run seed:superadmin` (o `npm run seed`) o actualiza el hash en la tabla `usuarios` manualmente.

---

## Solo superadmin (`scripts/seed-superadmin.js`)

Crea o actualiza únicamente el usuario superadmin. Útil para cambiar la contraseña del admin sin volver a ejecutar todo el seed.

```bash
# Requiere: migraciones y roles existentes (ejecutar antes npm run seed si es BD nueva)
npm run seed:superadmin
```

Usa las mismas variables de entorno que el seed completo: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NOMBRE`, `ADMIN_APELLIDO`, `ADMIN_DOCUMENTO`.
