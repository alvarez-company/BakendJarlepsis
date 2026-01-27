-- Script para crear datos iniciales del sistema
-- Ejecutar después de crear las tablas

-- ==========================================
-- 1. ROLES - PRINCIPALES
-- ==========================================
INSERT INTO roles (rolNombre, rolTipo, rolDescripcion, rolEstado, fechaCreacion, fechaActualizacion) VALUES
('Super Administrador', 'superadmin', 'Administrador con todos los permisos incluyendo cambio de roles', 1, NOW(), NOW()),
('Administrador', 'admin', 'Administrador de oficina con permisos completos excepto cambio de roles', 1, NOW(), NOW()),
('Administrador - Centro Operativo', 'administrador', 'Usuario con acceso de solo lectura a la información del centro operativo. No puede editar ni eliminar datos.', 1, NOW(), NOW()),
('Técnico', 'tecnico', 'Usuario técnico con acceso a aplicación móvil y instalaciones asignadas', 1, NOW(), NOW()),
('Soldador', 'soldador', 'Rol para personal de campo especializado en soldadura. Acceso principalmente a la aplicación móvil.', 1, NOW(), NOW()),
('Almacenista', 'almacenista', 'Puede gestionar entradas, salidas, asignaciones, devoluciones y traslados. Puede ver instalaciones y aprobar material.', 1, NOW(), NOW()),
('Bodega Internas', 'bodega-internas', 'Puede gestionar instalaciones, proyectos, usuarios y tipos de instalaciones. No puede asignar material. La información no se cruza con Bodega Redes.', 1, NOW(), NOW()),
('Bodega Redes', 'bodega-redes', 'Puede gestionar instalaciones, proyectos, usuarios y tipos de instalaciones. No puede asignar material. La información no se cruza con Bodega Internas.', 1, NOW(), NOW());

-- ==========================================
-- 2. CREAR SUPERADMIN
-- ==========================================
-- IMPORTANTE: Cambiar el email y generar el hash de la contraseña
-- Para generar el hash, ejecuta en Node.js:
-- node -e "const bcrypt = require('bcrypt'); bcrypt.hash('Admin123', 10).then(hash => console.log(hash));"

INSERT INTO usuarios (
  usuarioRolId,
  usuarioNombre,
  usuarioApellido,
  usuarioCorreo,
  usuarioDocumento,
  usuarioContrasena,
  usuarioEstado,
  fechaCreacion,
  fechaActualizacion
) VALUES (
  1, -- Rol SuperAdmin
  'Super',
  'Admin',
  'admin@estudio.com',  -- CAMBIAR EMAIL
  '9999999999',
  '$2b$10$TUDOKz7L3Kz5Kz5Kz5Kz5OeYjKz5Kz5Kz5Kz5Kz5Kz5Kz5Kz5Kz5K',  -- CAMBIAR PASSWORD HASH
  1,
  NOW(),
  NOW()
);

-- ==========================================
-- 3. TIPOS DE INSTALACIÓN
-- ==========================================
INSERT INTO tipos_instalacion (tipoInstalacionNombre, usuarioRegistra, fechaCreacion, fechaActualizacion) VALUES
('Instalación Nueva', 1, NOW(), NOW()),
('Reconexión', 1, NOW(), NOW()),
('Cambio de Medidor', 1, NOW(), NOW()),
('Reparación', 1, NOW(), NOW());

-- ==========================================
-- 4. TIPOS DE PROYECTO
-- ==========================================
INSERT INTO tipos_proyecto (tipoProyectoNombre, tipoProyectoDescripcion, tipoProyectoEstado, fechaCreacion, fechaActualizacion) VALUES
('Residencial', 'Proyectos para viviendas residenciales', 1, NOW(), NOW()),
('Comercial', 'Proyectos para establecimientos comerciales', 1, NOW(), NOW()),
('Industrial', 'Proyectos para instalaciones industriales', 1, NOW(), NOW());

-- ==========================================
-- 5. CATEGORÍAS PRINCIPALES
-- ==========================================
INSERT INTO categorias (categoriaNombre, categoriaDescripcion, categoriaCodigo, categoriaEstado, fechaCreacion, fechaActualizacion) VALUES
('Medidores', 'Equipos de medición', 'CAT-001', 1, NOW(), NOW()),
('Accesorios', 'Accesorios de instalación', 'CAT-002', 1, NOW(), NOW()),
('Herramientas', 'Herramientas de trabajo', 'CAT-003', 1, NOW(), NOW());

-- ==========================================
-- 6. SUB-CATEGORÍAS DE MEDIDORES
-- ==========================================
INSERT INTO categorias (categoriaNombre, categoriaDescripcion, categoriaCodigo, categoriaPadreId, categoriaEstado, fechaCreacion, fechaActualizacion) VALUES
('Medidores de Agua', 'Medidores para agua potable', 'CAT-001-001', 1, 1, NOW(), NOW()),
('Medidores de Energía', 'Medidores eléctricos', 'CAT-001-002', 1, 1, NOW(), NOW()),
('Medidores de Gas', 'Medidores para gas natural', 'CAT-001-003', 1, 1, NOW(), NOW());

-- ==========================================
-- NOTAS IMPORTANTES
-- ==========================================
-- 1. Cambiar el email del SuperAdmin en la línea correspondiente
-- 2. Generar hash de contraseña con bcrypt (ver instrucciones arriba)
-- 3. Reemplazar el hash en la línea correspondiente
-- 4. Los IDs de roles (1-8) corresponden a:
--    1: Super Administrador (superadmin)
--    2: Administrador (admin)
--    3: Administrador - Centro Operativo (administrador)
--    4: Técnico (tecnico)
--    5: Soldador (soldador)
--    6: Almacenista (almacenista)
--    7: Bodega Internas (bodega-internas)
--    8: Bodega Redes (bodega-redes)
-- 5. Ejecutar este script después de crear las tablas con las migraciones
-- 6. Usar este SuperAdmin para crear los demás usuarios desde la API
