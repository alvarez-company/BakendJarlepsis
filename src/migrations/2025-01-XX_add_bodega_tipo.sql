-- Migración: Agregar campo bodegaTipo a la tabla bodegas
-- Fecha: 2025-01-XX
-- Descripción: Agrega el campo bodegaTipo para distinguir entre bodegas internas y redes

-- ============================================
-- 1. AGREGAR COLUMNA bodegaTipo A bodegas
-- ============================================
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bodegas'
    AND COLUMN_NAME = 'bodegaTipo'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `bodegas` ADD COLUMN `bodegaTipo` VARCHAR(50) NULL AFTER `bodegaEstado`',
  'SELECT "La columna bodegaTipo ya existe en bodegas" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 2. ACTUALIZAR bodegas existentes según usuarios asignados
-- ============================================
-- Si un usuario con rol 'bodega-internas' está asignado a una bodega, marcarla como 'internas'
UPDATE `bodegas` b
INNER JOIN `usuarios` u ON b.bodegaId = u.usuarioBodega
INNER JOIN `roles` r ON u.usuarioRolId = r.rolId
SET b.bodegaTipo = 'internas'
WHERE r.rolTipo = 'bodega-internas'
  AND (b.bodegaTipo IS NULL OR b.bodegaTipo = '');

-- Si un usuario con rol 'bodega-redes' está asignado a una bodega, marcarla como 'redes'
UPDATE `bodegas` b
INNER JOIN `usuarios` u ON b.bodegaId = u.usuarioBodega
INNER JOIN `roles` r ON u.usuarioRolId = r.rolId
SET b.bodegaTipo = 'redes'
WHERE r.rolTipo = 'bodega-redes'
  AND (b.bodegaTipo IS NULL OR b.bodegaTipo = '');

-- ============================================
-- 3. COMENTARIO FINAL
-- ============================================
-- Nota: Las bodegas que no tengan usuarios con roles bodega-internas o bodega-redes
-- quedarán con bodegaTipo = NULL, lo cual es válido para bodegas generales
