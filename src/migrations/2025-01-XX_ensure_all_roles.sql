-- Migración para asegurar que todos los roles principales estén en la base de datos
-- Esta migración verifica y crea los roles si no existen

-- Super Administrador
INSERT INTO roles (rolNombre, rolTipo, rolDescripcion, rolEstado, fechaCreacion, fechaActualizacion)
SELECT 
  'Super Administrador',
  'superadmin',
  'Administrador con todos los permisos incluyendo cambio de roles',
  1,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE rolTipo = 'superadmin'
);

-- Administrador
INSERT INTO roles (rolNombre, rolTipo, rolDescripcion, rolEstado, fechaCreacion, fechaActualizacion)
SELECT 
  'Administrador',
  'admin',
  'Administrador de oficina con permisos completos excepto cambio de roles',
  1,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE rolTipo = 'admin'
);

-- Técnico
INSERT INTO roles (rolNombre, rolTipo, rolDescripcion, rolEstado, fechaCreacion, fechaActualizacion)
SELECT 
  'Técnico',
  'tecnico',
  'Usuario técnico con acceso a aplicación móvil y instalaciones asignadas',
  1,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE rolTipo = 'tecnico'
);

-- Administrador - Centro Operativo
INSERT INTO roles (rolNombre, rolTipo, rolDescripcion, rolEstado, fechaCreacion, fechaActualizacion)
SELECT 
  'Administrador - Centro Operativo',
  'administrador',
  'Usuario con acceso de solo lectura a la información del centro operativo. No puede editar ni eliminar datos.',
  1,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE rolTipo = 'administrador'
);

-- Almacenista
INSERT INTO roles (rolNombre, rolTipo, rolDescripcion, rolEstado, fechaCreacion, fechaActualizacion)
SELECT 
  'Almacenista',
  'almacenista',
  'Puede gestionar entradas, salidas, asignaciones, devoluciones y traslados. Puede ver instalaciones y aprobar material, pero no puede editar, eliminar ni cambiar estado de instalaciones.',
  1,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE rolTipo = 'almacenista'
);

-- Soldador
INSERT INTO roles (rolNombre, rolTipo, rolDescripcion, rolEstado, fechaCreacion, fechaActualizacion)
SELECT 
  'Soldador',
  'soldador',
  'Rol para personal de campo especializado en soldadura. Acceso principalmente a la aplicación móvil.',
  1,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE rolTipo = 'soldador'
);

-- Bodega Internas
INSERT INTO roles (rolNombre, rolTipo, rolDescripcion, rolEstado, fechaCreacion, fechaActualizacion)
SELECT 
  'Bodega Internas',
  'bodega-internas',
  'Puede gestionar instalaciones, proyectos, usuarios y tipos de instalaciones. No puede asignar material. La información no se cruza con Bodega Redes.',
  1,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE rolTipo = 'bodega-internas'
);

-- Bodega Redes
INSERT INTO roles (rolNombre, rolTipo, rolDescripcion, rolEstado, fechaCreacion, fechaActualizacion)
SELECT 
  'Bodega Redes',
  'bodega-redes',
  'Puede gestionar instalaciones, proyectos, usuarios y tipos de instalaciones. No puede asignar material. La información no se cruza con Bodega Internas.',
  1,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE rolTipo = 'bodega-redes'
);

