-- Migración para agregar campo instalacionCodigo a la tabla clientes
-- Fecha: 2025-01-XX
-- Descripción: Agregar columna instalacionCodigo obligatoria para almacenar el código de instalación del cliente

-- Verificar si la columna ya existe
SET @col_instalacion_codigo_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'clientes'
    AND COLUMN_NAME = 'instalacionCodigo'
);

-- Si no existe, agregarla
SET @sql_add_col = IF(@col_instalacion_codigo_exists = 0,
  'ALTER TABLE `clientes` ADD COLUMN `instalacionCodigo` VARCHAR(255) NOT NULL AFTER `clienteTelefono`',
  'SELECT "La columna instalacionCodigo ya existe" AS message'
);

PREPARE stmt_add_col FROM @sql_add_col;
EXECUTE stmt_add_col;
DEALLOCATE PREPARE stmt_add_col;

-- Si la columna se agregó, establecer valores por defecto para registros existentes
-- Generar códigos únicos para clientes existentes que no tengan código
SET @sql_update_existing = IF(@col_instalacion_codigo_exists = 0,
  CONCAT('UPDATE `clientes` SET `instalacionCodigo` = CONCAT(\'CLI-\', LPAD(`clienteId`, 6, \'0\')) WHERE `instalacionCodigo` = \'\' OR `instalacionCodigo` IS NULL'),
  'SELECT "No es necesario actualizar valores existentes" AS message'
);

PREPARE stmt_update FROM @sql_update_existing;
EXECUTE stmt_update;
DEALLOCATE PREPARE stmt_update;

-- Agregar índice único para asegurar que no haya códigos duplicados
SET @idx_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'clientes'
    AND INDEX_NAME = 'idx_clientes_instalacion_codigo'
);

SET @sql_add_idx = IF(@idx_exists = 0,
  'ALTER TABLE `clientes` ADD UNIQUE INDEX `idx_clientes_instalacion_codigo` (`instalacionCodigo`)',
  'SELECT "El índice ya existe" AS message'
);

PREPARE stmt_idx FROM @sql_add_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;

SELECT 'Migración completada. La columna instalacionCodigo ha sido agregada a la tabla clientes.' AS resultado;

