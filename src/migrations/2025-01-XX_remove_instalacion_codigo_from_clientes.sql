-- Migración para eliminar la columna instalacionCodigo de la tabla clientes
-- Fecha: 2025-01-XX
-- Descripción: Eliminar instalacionCodigo de clientes ya que ahora se maneja en cada instalación

-- Verificar si la columna existe
SET @col_instalacion_codigo_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'clientes'
    AND COLUMN_NAME = 'instalacionCodigo'
);

-- Si existe, eliminarla
SET @sql_drop_col = IF(@col_instalacion_codigo_exists > 0,
  'ALTER TABLE `clientes` DROP COLUMN `instalacionCodigo`',
  'SELECT "La columna instalacionCodigo ya no existe en clientes" AS message'
);

PREPARE stmt_drop_col FROM @sql_drop_col;
EXECUTE stmt_drop_col;
DEALLOCATE PREPARE stmt_drop_col;

SELECT 'Migración completada. La columna instalacionCodigo ha sido eliminada de la tabla clientes.' AS resultado;

