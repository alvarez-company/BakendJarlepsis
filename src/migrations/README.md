# Migraciones

Las migraciones se crean automáticamente cuando cambias tus entidades.

## Orden de Ejecución de Migraciones

Las migraciones TypeScript se ejecutan en orden cronológico según su timestamp. El orden correcto es:

1. `1761918287307-InitSchema.ts` - Crea el esquema inicial de la base de datos
2. `1761918287308-AddUsuarioFotoToUsuarios.ts` - Agrega columna usuarioFoto
3. `1761918287309-FixSchemaAfterInit.ts` - Corrige y ajusta el esquema después de InitSchema
4. `1763053167123-CreateMaterialesBodegas.ts` - Crea tabla materiales_bodegas
5. `1763053167124-AddMissingColumns.ts` - Agrega columnas críticas faltantes (unidadMedidaId, identificadorUnico)

## Comandos Disponibles

### Crear una nueva migración

```bash
npm run migration:generate -- -n NombreDescriptivo
```

### Ejecutar migraciones pendientes

```bash
npm run migration:run
```

### Ver estado de las migraciones

```bash
npm run migration:show
```

Este comando muestra qué migraciones están ejecutadas y cuáles están pendientes.

### Revertir la última migración

```bash
npm run migration:revert
```

## Importante

- Las migraciones se generan automáticamente basándose en los cambios en tus entidades
- Nunca edites manualmente una migración ya ejecutada
- Siempre revisa la migración generada antes de ejecutarla
- Haz backup de tu base de datos antes de ejecutar migraciones en producción
- Las migraciones se ejecutan en orden cronológico según el timestamp en el nombre del archivo
- TypeORM solo ejecuta migraciones TypeScript (.ts), no archivos SQL directos

## Archivos SQL en esta carpeta

- **`full_seed.sql`**: seed completo en SQL (tablas auxiliares + datos). Ejecutar en MySQL después de `npm run migration:run`. Ver `documents/SEED_Y_RESET.md`.
- **`seed_colombia.sql`**: datos de Colombia (país, departamentos, municipios). Lo ejecuta `npm run seed` (`seed-full.js`).
- **`2025-01-XX_create_estados_tables.sql`**, **`2025-01-XX_create_auditoria_inventario.sql`**, **`2025-11-19_create_clasificaciones.sql`**, **`2025-01-XX_create_numeros_medidor_table.sql`**: tablas auxiliares que ejecuta el seed (`seed-full.js`). No los ejecuta TypeORM.
