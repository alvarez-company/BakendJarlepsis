-- Migración para actualizar los estados de instalación
-- Cambiar de: pendiente, en_proceso, completada, finalizada, cancelada
-- A: asignacion, construccion, certificacion, novedad, anulada

-- Paso 1: Agregar nuevas columnas temporales para mapeo
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'instalaciones'
    AND COLUMN_NAME = 'estado_temp'
);

SET @sql_add_col = IF(@col_exists = 0,
  'ALTER TABLE `instalaciones` ADD COLUMN `estado_temp` VARCHAR(50) NULL',
  'SELECT "Columna estado_temp ya existe" AS message'
);

PREPARE stmt FROM @sql_add_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Paso 2: Mapear estados antiguos a nuevos
UPDATE `instalaciones` 
SET `estado_temp` = CASE 
  WHEN `estado` = 'pendiente' THEN 'asignacion'
  WHEN `estado` = 'en_proceso' THEN 'construccion'
  WHEN `estado` = 'completada' THEN 'certificacion'
  WHEN `estado` = 'finalizada' THEN 'certificacion'
  WHEN `estado` = 'cancelada' THEN 'anulada'
  ELSE 'asignacion'
END;

-- Paso 3: Actualizar el enum de la columna estado
ALTER TABLE `instalaciones` 
MODIFY COLUMN `estado` ENUM('asignacion', 'construccion', 'certificacion', 'novedad', 'anulada') NOT NULL DEFAULT 'asignacion';

-- Paso 4: Copiar los valores mapeados
UPDATE `instalaciones` 
SET `estado` = `estado_temp`;

-- Paso 5: Eliminar la columna temporal
SET @col_exists_temp = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'instalaciones'
    AND COLUMN_NAME = 'estado_temp'
);

SET @sql_drop_col = IF(@col_exists_temp > 0,
  'ALTER TABLE `instalaciones` DROP COLUMN `estado_temp`',
  'SELECT "Columna estado_temp no existe" AS message'
);

PREPARE stmt_drop FROM @sql_drop_col;
EXECUTE stmt_drop;
DEALLOCATE PREPARE stmt_drop;

-- Agregar columna materialAprobado a instalaciones_materiales si no existe
SET @col_material_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'instalaciones_materiales'
    AND COLUMN_NAME = 'materialAprobado'
);

SET @sql_add_material = IF(@col_material_exists = 0,
  'ALTER TABLE `instalaciones_materiales` ADD COLUMN `materialAprobado` TINYINT(1) NULL DEFAULT NULL COMMENT ''null = pendiente, 1 = aprobado, 0 = desaprobado''',
  'SELECT "Columna materialAprobado ya existe" AS message'
);

PREPARE stmt_material FROM @sql_add_material;
EXECUTE stmt_material;
DEALLOCATE PREPARE stmt_material;

