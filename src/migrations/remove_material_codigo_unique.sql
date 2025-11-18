-- Migración para quitar el constraint UNIQUE de materialCodigo
-- Fecha: 2025-11-05
-- Descripción: Permitir que múltiples materiales tengan el mismo código (variantes)

-- Buscar y eliminar el índice único si existe
SET @index_name = NULL;
SELECT INDEX_NAME INTO @index_name
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'materiales'
  AND COLUMN_NAME = 'materialCodigo'
  AND NON_UNIQUE = 0
LIMIT 1;

SET @sql = IF(@index_name IS NOT NULL,
  CONCAT('ALTER TABLE materiales DROP INDEX ', @index_name),
  'SELECT "No unique index found for materialCodigo" as message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

