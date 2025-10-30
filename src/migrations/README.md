# Migraciones

Las migraciones se crean automáticamente cuando cambias tus entidades.

## Crear una nueva migración

```bash
npm run migration:generate -- -n NombreDescriptivo
```

## Ejecutar migraciones

```bash
npm run migration:run
```

## Revertir la última migración

```bash
npm run migration:revert
```

## Importante

- Las migraciones se generan automáticamente basándose en los cambios en tus entidades
- Nunca edites manualmente una migración ya ejecutada
- Siempre revisa la migración generada antes de ejecutarla
- Haz backup de tu base de datos antes de ejecutar migraciones en producción

