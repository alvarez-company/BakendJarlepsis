-- Migración para agregar los nuevos roles del sistema
-- Roles: Administrador (Centro Operativo), Almacenista, Bodega Internas, Bodega Redes, Soldador

-- Insertar rol Administrador (Centro Operativo) - Solo lectura
INSERT INTO roles (rolNombre, rolTipo, rolDescripcion, rolEstado, fechaCreacion, fechaActualizacion)
VALUES (
  'Administrador - Centro Operativo',
  'administrador',
  'Usuario con acceso de solo lectura a la información del centro operativo. No puede editar ni eliminar datos.',
  true,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  rolNombre = VALUES(rolNombre),
  rolDescripcion = VALUES(rolDescripcion),
  fechaActualizacion = NOW();

-- Insertar rol Almacenista
INSERT INTO roles (rolNombre, rolTipo, rolDescripcion, rolEstado, fechaCreacion, fechaActualizacion)
VALUES (
  'Almacenista',
  'almacenista',
  'Puede gestionar entradas, salidas, asignaciones, devoluciones y traslados. Puede ver instalaciones y aprobar material, pero no puede editar, eliminar ni cambiar estado de instalaciones.',
  true,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  rolNombre = VALUES(rolNombre),
  rolDescripcion = VALUES(rolDescripcion),
  fechaActualizacion = NOW();

-- Insertar rol Bodega Internas
INSERT INTO roles (rolNombre, rolTipo, rolDescripcion, rolEstado, fechaCreacion, fechaActualizacion)
VALUES (
  'Bodega Internas',
  'bodega-internas',
  'Puede gestionar instalaciones, proyectos, usuarios y tipos de instalaciones. No puede asignar material. La información no se cruza con Bodega Redes.',
  true,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  rolNombre = VALUES(rolNombre),
  rolDescripcion = VALUES(rolDescripcion),
  fechaActualizacion = NOW();

-- Insertar rol Bodega Redes
INSERT INTO roles (rolNombre, rolTipo, rolDescripcion, rolEstado, fechaCreacion, fechaActualizacion)
VALUES (
  'Bodega Redes',
  'bodega-redes',
  'Puede gestionar instalaciones, proyectos, usuarios y tipos de instalaciones. No puede asignar material. La información no se cruza con Bodega Internas.',
  true,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  rolNombre = VALUES(rolNombre),
  rolDescripcion = VALUES(rolDescripcion),
  fechaActualizacion = NOW();

-- Insertar rol Soldador
INSERT INTO roles (rolNombre, rolTipo, rolDescripcion, rolEstado, fechaCreacion, fechaActualizacion)
VALUES (
  'Soldador',
  'soldador',
  'Rol para personal de campo especializado en soldadura. Acceso principalmente a la aplicación móvil.',
  true,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  rolNombre = VALUES(rolNombre),
  rolDescripcion = VALUES(rolDescripcion),
  fechaActualizacion = NOW();

