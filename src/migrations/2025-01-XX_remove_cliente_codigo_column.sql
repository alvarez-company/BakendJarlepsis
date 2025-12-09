-- Migración para eliminar la columna clienteCodigo de la tabla clientes
-- Fecha: 2025-01-XX
-- Descripción: Eliminar la columna clienteCodigo ya que solo se necesita instalacionCodigo

-- Verificar si la columna existe
SET @col_cliente_codigo_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'clientes'
    AND COLUMN_NAME = 'clienteCodigo'
);

-- Si existe, eliminarla
SET @sql_drop_col = IF(@col_cliente_codigo_exists > 0,
  'ALTER TABLE `clientes` DROP COLUMN `clienteCodigo`',
  'SELECT "La columna clienteCodigo ya no existe" AS message'
);

PREPARE stmt_drop_col FROM @sql_drop_col;
EXECUTE stmt_drop_col;
DEALLOCATE PREPARE stmt_drop_col;

SELECT 'Migración completada. La columna clienteCodigo ha sido eliminada de la tabla clientes.' AS resultado;

