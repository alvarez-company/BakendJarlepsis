-- Agregar columna observacionesTecnico a la tabla instalaciones
-- Este campo será usado por el técnico para agregar sus observaciones específicas

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE table_name = 'instalaciones' 
   AND column_name = 'observacionesTecnico') = 0,
  'ALTER TABLE `instalaciones` 
   ADD COLUMN `observacionesTecnico` TEXT NULL 
   AFTER `instalacionObservaciones`',
  'SELECT "Column observacionesTecnico already exists in instalaciones. Skipping." AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Migración completada. La columna observacionesTecnico ha sido agregada a instalaciones.' AS resultado;

