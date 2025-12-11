-- Migración para agregar el campo fechaAsignacionMetrogas a la tabla instalaciones

-- Agregar columna fechaAsignacionMetrogas
SET @col_exists = (SELECT COUNT(*) 
                   FROM information_schema.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = 'instalaciones' 
                   AND COLUMN_NAME = 'fechaAsignacionMetrogas');

SET @sql_add_col = IF(@col_exists = 0,
    'ALTER TABLE `instalaciones` ADD COLUMN `fechaAsignacionMetrogas` DATE NULL AFTER `instalacionFecha`',
    'SELECT "La columna fechaAsignacionMetrogas ya existe en la tabla instalaciones" AS message');

PREPARE stmt FROM @sql_add_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
