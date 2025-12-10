-- Migración para agregar campos de foto a sedes, oficinas, bodegas y usuarios
-- Fecha: 2025-11-20
-- Descripción: Agrega columnas de foto de perfil opcionales

-- ============================================
-- 1. AGREGAR sedeFoto A SEDES
-- ============================================
SET @col_sede_foto_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sedes'
    AND COLUMN_NAME = 'sedeFoto'
);

SET @sql_sede_foto = IF(@col_sede_foto_exists = 0,
  'ALTER TABLE `sedes` ADD COLUMN `sedeFoto` LONGTEXT NULL AFTER `sedeCorreo`',
  'SELECT "La columna sedeFoto ya existe en sedes" AS message'
);

PREPARE stmt_sede_foto FROM @sql_sede_foto;
EXECUTE stmt_sede_foto;
DEALLOCATE PREPARE stmt_sede_foto;

-- ============================================
-- 2. AGREGAR oficinaFoto A OFICINAS
-- ============================================
SET @col_oficina_foto_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'oficinas'
    AND COLUMN_NAME = 'oficinaFoto'
);

SET @sql_oficina_foto = IF(@col_oficina_foto_exists = 0,
  'ALTER TABLE `oficinas` ADD COLUMN `oficinaFoto` LONGTEXT NULL AFTER `oficinaCorreo`',
  'SELECT "La columna oficinaFoto ya existe en oficinas" AS message'
);

PREPARE stmt_oficina_foto FROM @sql_oficina_foto;
EXECUTE stmt_oficina_foto;
DEALLOCATE PREPARE stmt_oficina_foto;

-- ============================================
-- 3. AGREGAR bodegaFoto A BODEGAS
-- ============================================
SET @col_bodega_foto_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bodegas'
    AND COLUMN_NAME = 'bodegaFoto'
);

SET @sql_bodega_foto = IF(@col_bodega_foto_exists = 0,
  'ALTER TABLE `bodegas` ADD COLUMN `bodegaFoto` LONGTEXT NULL AFTER `bodegaCorreo`',
  'SELECT "La columna bodegaFoto ya existe en bodegas" AS message'
);

PREPARE stmt_bodega_foto FROM @sql_bodega_foto;
EXECUTE stmt_bodega_foto;
DEALLOCATE PREPARE stmt_bodega_foto;

-- ============================================
-- 4. AGREGAR usuarioFoto A USUARIOS
-- ============================================
SET @col_usuario_foto_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'usuarios'
    AND COLUMN_NAME = 'usuarioFoto'
);

SET @sql_usuario_foto = IF(@col_usuario_foto_exists = 0,
  'ALTER TABLE `usuarios` ADD COLUMN `usuarioFoto` LONGTEXT NULL AFTER `usuarioCreador`',
  'SELECT "La columna usuarioFoto ya existe en usuarios" AS message'
);

PREPARE stmt_usuario_foto FROM @sql_usuario_foto;
EXECUTE stmt_usuario_foto;
DEALLOCATE PREPARE stmt_usuario_foto;

-- Mensaje final
SELECT 'Migración completada. Verifique que todas las columnas se hayan agregado correctamente.' AS resultado;

