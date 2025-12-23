-- Migración para agregar índice único al campo materialNombre
-- Fecha: 2025-01-XX
-- Descripción: Asegura que el nombre de un material sea único en todo el sistema

-- Verificar si el índice ya existe antes de crearlo
SET @index_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'materiales'
    AND INDEX_NAME = 'IDX_materialNombre_unique'
);

-- Si el índice no existe, crearlo
SET @sql = IF(@index_exists = 0,
  'CREATE UNIQUE INDEX `IDX_materialNombre_unique` ON `materiales` (`materialNombre`)',
  'SELECT "El índice único para materialNombre ya existe" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Migración completada. El campo materialNombre ahora tiene índice único.' AS resultado;

