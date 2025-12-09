-- Agregar columna materialAprobado a la tabla instalaciones_materiales
-- null = pendiente, true = aprobado, false = desaprobado

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE table_name = 'instalaciones_materiales' 
   AND column_name = 'materialAprobado') = 0,
  'ALTER TABLE `instalaciones_materiales` 
   ADD COLUMN `materialAprobado` BOOLEAN NULL DEFAULT NULL 
   AFTER `observaciones`',
  'SELECT "Column materialAprobado already exists in instalaciones_materiales. Skipping." AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Migración completada. La columna materialAprobado ha sido agregada a instalaciones_materiales.' AS resultado;

