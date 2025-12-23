-- Migración para hacer fechaAsignacionMetrogas obligatorio (NOT NULL)
-- Fecha: 2025-01-XX
-- Descripción: Cambiar fechaAsignacionMetrogas de NULL a NOT NULL

-- Verificar si la columna existe
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'instalaciones' 
    AND COLUMN_NAME = 'fechaAsignacionMetrogas'
);

-- Si la columna existe, actualizar registros NULL y luego cambiar a NOT NULL
-- Paso 1: Actualizar registros NULL con una fecha por defecto (fecha actual)
UPDATE `instalaciones` 
SET `fechaAsignacionMetrogas` = CURDATE() 
WHERE `fechaAsignacionMetrogas` IS NULL;

-- Paso 2: Cambiar la columna a NOT NULL
SET @sql_alter = IF(@col_exists > 0,
  'ALTER TABLE `instalaciones` MODIFY COLUMN `fechaAsignacionMetrogas` DATE NOT NULL',
  'SELECT "La columna fechaAsignacionMetrogas no existe" AS message'
);

PREPARE stmt FROM @sql_alter;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Migración completada. fechaAsignacionMetrogas ahora es obligatorio (NOT NULL).' AS resultado;

