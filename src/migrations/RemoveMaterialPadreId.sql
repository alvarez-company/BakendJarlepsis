-- Migración para eliminar la columna materialPadreId de la tabla materiales
-- Esta columna ya no se usa en la entidad Material

-- Eliminar foreign key constraint si existe
SET @fk_exists = (SELECT COUNT(*) 
                  FROM information_schema.TABLE_CONSTRAINTS 
                  WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'materiales' 
                  AND CONSTRAINT_NAME = 'fk_materiales_materialPadre'
                  AND CONSTRAINT_TYPE = 'FOREIGN KEY');

SET @sql_drop_fk = IF(@fk_exists > 0,
    'ALTER TABLE materiales DROP FOREIGN KEY fk_materiales_materialPadre',
    'SELECT 1');

PREPARE stmt_fk FROM @sql_drop_fk;
EXECUTE stmt_fk;
DEALLOCATE PREPARE stmt_fk;

-- Eliminar índice si existe
SET @idx_exists = (SELECT COUNT(*) 
                   FROM information_schema.STATISTICS 
                   WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = 'materiales' 
                   AND INDEX_NAME = 'idx_materiales_materialPadreId');

SET @sql_drop_idx = IF(@idx_exists > 0,
    'ALTER TABLE materiales DROP INDEX idx_materiales_materialPadreId',
    'SELECT 1');

PREPARE stmt_idx FROM @sql_drop_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;

-- Eliminar columna si existe
SET @col_exists = (SELECT COUNT(*) 
                   FROM information_schema.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = 'materiales' 
                   AND COLUMN_NAME = 'materialPadreId');

SET @sql_drop_col = IF(@col_exists > 0,
    'ALTER TABLE materiales DROP COLUMN materialPadreId',
    'SELECT "La columna materialPadreId no existe en la tabla materiales" AS message');

PREPARE stmt_col FROM @sql_drop_col;
EXECUTE stmt_col;
DEALLOCATE PREPARE stmt_col;
