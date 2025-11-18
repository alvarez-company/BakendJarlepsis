-- Migración para actualizar la tabla materiales
-- Fecha: 2025-11-05
-- Descripción: 
--   1. Hacer inventarioId nullable
--   2. Eliminar materialStockMinimo
--   3. Eliminar materialStockMaximo
--   4. Eliminar materialCodigoBarras

-- Modificar inventarioId para que sea nullable
ALTER TABLE materiales 
MODIFY COLUMN inventarioId INT NULL;

-- Eliminar materialStockMinimo (si existe)
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = DATABASE() 
               AND TABLE_NAME = 'materiales' 
               AND COLUMN_NAME = 'materialStockMinimo');
SET @sqlstmt := IF(@exist > 0, 'ALTER TABLE materiales DROP COLUMN materialStockMinimo', 'SELECT "materialStockMinimo no existe"');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Eliminar materialStockMaximo (si existe)
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = DATABASE() 
               AND TABLE_NAME = 'materiales' 
               AND COLUMN_NAME = 'materialStockMaximo');
SET @sqlstmt := IF(@exist > 0, 'ALTER TABLE materiales DROP COLUMN materialStockMaximo', 'SELECT "materialStockMaximo no existe"');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Eliminar materialCodigoBarras (si existe)
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = DATABASE() 
               AND TABLE_NAME = 'materiales' 
               AND COLUMN_NAME = 'materialCodigoBarras');
SET @sqlstmt := IF(@exist > 0, 'ALTER TABLE materiales DROP COLUMN materialCodigoBarras', 'SELECT "materialCodigoBarras no existe"');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
