-- Script para crear datos iniciales del sistema
-- Ejecutar después de crear las tablas

-- ==========================================
-- 1. ROLES - COMPLETOS
-- ==========================================
INSERT INTO roles (rolNombre, rolTipo, rolDescripcion, rolEstado, fechaCreacion, fechaActualizacion) VALUES
('Super Administrador', 'superadmin', 'Administrador con todos los permisos incluyendo cambio de roles', 1, NOW(), NOW()),
('Administrador', 'admin', 'Administrador de oficina con permisos completos excepto cambio de roles', 1, NOW(), NOW()),
('Técnico', 'tecnico', 'Usuario técnico con acceso a aplicación móvil y instalaciones asignadas', 1, NOW(), NOW()),
('Empleado', 'empleado', 'Empleado común para apoyo en instalaciones', 1, NOW(), NOW()),
('Encargado de Bodega', 'bodega', 'Usuario encargado de gestionar bodega específica', 1, NOW(), NOW()),
('Inventario', 'inventario', 'Usuario para gestión de inventario', 1, NOW(), NOW()),
('Traslados', 'traslados', 'Usuario para gestionar traslados entre bodegas', 1, NOW(), NOW()),
('Entradas', 'entradas', 'Usuario para registrar entradas de materiales', 1, NOW(), NOW()),
('Salidas', 'salidas', 'Usuario para registrar salidas de materiales', 1, NOW(), NOW()),
('Devoluciones', 'devoluciones', 'Usuario para registrar devoluciones de materiales', 1, NOW(), NOW()),
('Instalaciones', 'instalaciones', 'Usuario para gestionar instalaciones', 1, NOW(), NOW());

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
-- 1. Cambiar el email del SuperAdmin en la línea 17
-- 2. Generar hash de contraseña con bcrypt (ver instrucciones arriba)
-- 3. Reemplazar el hash en la línea 18
-- 4. Los IDs de roles (1-10) corresponden a:
--    1: SuperAdmin
--    2: Admin
--    3: Técnico
--    4: Bodega
--    5: Inventario
--    6: Traslados
--    7: Entradas
--    8: Salidas
--    9: Devoluciones
--    10: Instalaciones
-- 5. Ejecutar este script después de crear las tablas con las migraciones
-- 6. Usar este SuperAdmin para crear los demás usuarios desde la API
