-- Migración para agregar tipos de notificación para estados legacy de instalaciones
-- Fecha: 2025-01-XX
-- Descripción: Agregar tipos de notificación para asignacion, construccion, certificacion, novedad y anulada

-- Verificar si los nuevos tipos ya existen en el enum
SET @enum_has_asignacion = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'notificaciones'
    AND COLUMN_NAME = 'tipoNotificacion'
    AND COLUMN_TYPE LIKE '%instalacion_asignacion%'
);

-- Si no tienen los nuevos tipos, agregarlos
SET @sql_enum = IF(@enum_has_asignacion = 0,
  'ALTER TABLE `notificaciones` MODIFY COLUMN `tipoNotificacion` ENUM(
    \'mensaje_nuevo\',
    \'reaccion_mensaje\',
    \'instalacion_completada\',
    \'instalacion_asignada\',
    \'instalacion_en_proceso\',
    \'instalacion_cancelada\',
    \'instalacion_asignacion\',
    \'instalacion_construccion\',
    \'instalacion_certificacion\',
    \'instalacion_novedad\',
    \'instalacion_anulada\',
    \'mensaje_respondido\',
    \'usuario_ingreso_grupo\',
    \'usuario_salio_grupo\'
  ) NOT NULL',
  'SELECT "Los tipos de notificación legacy ya existen" AS message'
);

PREPARE stmt_enum FROM @sql_enum;
EXECUTE stmt_enum;
DEALLOCATE PREPARE stmt_enum;

SELECT 'Migración completada. Los nuevos tipos de notificación para estados legacy han sido agregados.' AS resultado;

