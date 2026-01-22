-- Script SQL urgente para agregar columna clienteEstado
-- Ejecutar directamente en la base de datos si las migraciones no se pueden ejecutar

-- Verificar si la columna ya existe antes de agregarla
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'clientes'
    AND COLUMN_NAME = 'clienteEstado'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `clientes` ADD COLUMN `clienteEstado` ENUM(\'activo\', \'instalacion_asignada\', \'realizando_instalacion\') NOT NULL DEFAULT \'activo\' AFTER `cantidadInstalaciones`',
  'SELECT "La columna clienteEstado ya existe" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Actualizar registros existentes para que tengan el valor por defecto si es necesario
UPDATE `clientes` 
SET `clienteEstado` = 'activo' 
WHERE `clienteEstado` IS NULL OR `clienteEstado` = '';

SELECT 'Columna clienteEstado agregada exitosamente' AS resultado;
