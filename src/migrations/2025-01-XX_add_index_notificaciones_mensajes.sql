-- Migración para agregar índice optimizado para contar mensajes no leídos
-- Fecha: 2025-01-XX
-- Descripción: Índice compuesto para optimizar la consulta de mensajes no leídos

-- Verificar si el índice ya existe antes de crearlo
SET @index_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'notificaciones'
    AND INDEX_NAME = 'IDX_notificaciones_mensajes_no_leidos'
);

-- Si el índice no existe, crearlo
SET @sql = IF(@index_exists = 0,
  'CREATE INDEX `IDX_notificaciones_mensajes_no_leidos` ON `notificaciones` (`usuarioId`, `leida`, `tipoNotificacion`)',
  'SELECT "El índice para mensajes no leídos ya existe" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Migración completada. Índice para mensajes no leídos creado.' AS resultado;

