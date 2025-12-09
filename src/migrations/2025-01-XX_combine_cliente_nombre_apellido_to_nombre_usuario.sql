-- Migración para combinar clienteNombre y clienteApellido en nombreUsuario
-- Fecha: 2025-01-XX
-- Descripción: Combinar las columnas clienteNombre y clienteApellido en una sola columna nombreUsuario

-- Verificar si la columna nombreUsuario ya existe
SET @col_nombre_usuario_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'clientes'
    AND COLUMN_NAME = 'nombreUsuario'
);

-- Si no existe, agregarla
SET @sql_add_col = IF(@col_nombre_usuario_exists = 0,
  'ALTER TABLE `clientes` ADD COLUMN `nombreUsuario` VARCHAR(255) NULL AFTER `clienteId`',
  'SELECT "La columna nombreUsuario ya existe" AS message'
);

PREPARE stmt_add_col FROM @sql_add_col;
EXECUTE stmt_add_col;
DEALLOCATE PREPARE stmt_add_col;

-- Combinar clienteNombre y clienteApellido en nombreUsuario para registros existentes
SET @sql_combine = IF(@col_nombre_usuario_exists = 0,
  'UPDATE `clientes` SET `nombreUsuario` = CONCAT(COALESCE(`clienteNombre`, ""), " ", COALESCE(`clienteApellido`, "")) WHERE `nombreUsuario` IS NULL OR `nombreUsuario` = ""',
  'SELECT "No es necesario combinar valores existentes" AS message'
);

PREPARE stmt_combine FROM @sql_combine;
EXECUTE stmt_combine;
DEALLOCATE PREPARE stmt_combine;

-- Limpiar espacios extra y hacer la columna NOT NULL
SET @sql_clean = IF(@col_nombre_usuario_exists = 0,
  'UPDATE `clientes` SET `nombreUsuario` = TRIM(`nombreUsuario`) WHERE `nombreUsuario` IS NOT NULL',
  'SELECT "No es necesario limpiar valores" AS message'
);

PREPARE stmt_clean FROM @sql_clean;
EXECUTE stmt_clean;
DEALLOCATE PREPARE stmt_clean;

-- Hacer la columna NOT NULL
SET @sql_not_null = IF(@col_nombre_usuario_exists = 0,
  'ALTER TABLE `clientes` MODIFY COLUMN `nombreUsuario` VARCHAR(255) NOT NULL',
  'SELECT "La columna ya es NOT NULL" AS message'
);

PREPARE stmt_not_null FROM @sql_not_null;
EXECUTE stmt_not_null;
DEALLOCATE PREPARE stmt_not_null;

-- Eliminar las columnas antiguas clienteNombre y clienteApellido
SET @col_nombre_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'clientes'
    AND COLUMN_NAME = 'clienteNombre'
);

SET @sql_drop_nombre = IF(@col_nombre_exists > 0,
  'ALTER TABLE `clientes` DROP COLUMN `clienteNombre`',
  'SELECT "La columna clienteNombre ya no existe" AS message'
);

PREPARE stmt_drop_nombre FROM @sql_drop_nombre;
EXECUTE stmt_drop_nombre;
DEALLOCATE PREPARE stmt_drop_nombre;

SET @col_apellido_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'clientes'
    AND COLUMN_NAME = 'clienteApellido'
);

SET @sql_drop_apellido = IF(@col_apellido_exists > 0,
  'ALTER TABLE `clientes` DROP COLUMN `clienteApellido`',
  'SELECT "La columna clienteApellido ya no existe" AS message'
);

PREPARE stmt_drop_apellido FROM @sql_drop_apellido;
EXECUTE stmt_drop_apellido;
DEALLOCATE PREPARE stmt_drop_apellido;

SELECT 'Migración completada. Las columnas clienteNombre y clienteApellido han sido combinadas en nombreUsuario.' AS resultado;

