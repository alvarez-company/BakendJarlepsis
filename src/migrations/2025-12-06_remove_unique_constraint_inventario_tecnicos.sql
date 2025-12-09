-- Eliminar restricción única de inventario_tecnicos para permitir múltiples asignaciones
-- del mismo material al mismo técnico

-- Verificar si el índice existe antes de eliminarlo
SET @index_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'inventario_tecnicos'
    AND INDEX_NAME = 'UQ_usuario_material'
);

SET @sql = IF(@index_exists > 0,
  'ALTER TABLE `inventario_tecnicos` DROP INDEX `UQ_usuario_material`',
  'SELECT "El índice UQ_usuario_material no existe" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

