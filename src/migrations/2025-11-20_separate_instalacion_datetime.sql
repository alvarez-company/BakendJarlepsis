-- Migración para separar instalacionFechaHora en fecha, hora inicio y hora final
-- Fecha: 2025-11-20
-- Descripción: Separa el campo datetime en campos separados para mejor control

-- ============================================
-- 1. AGREGAR instalacionFecha (DATE)
-- ============================================
SET @col_fecha_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'instalaciones'
    AND COLUMN_NAME = 'instalacionFecha'
);

SET @sql_fecha = IF(@col_fecha_exists = 0,
  'ALTER TABLE `instalaciones` ADD COLUMN `instalacionFecha` DATE NULL AFTER `instalacionSelloNumero`',
  'SELECT "La columna instalacionFecha ya existe" AS message'
);

PREPARE stmt_fecha FROM @sql_fecha;
EXECUTE stmt_fecha;
DEALLOCATE PREPARE stmt_fecha;

-- ============================================
-- 2. AGREGAR instalacionHoraInicio (TIME)
-- ============================================
SET @col_hora_inicio_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'instalaciones'
    AND COLUMN_NAME = 'instalacionHoraInicio'
);

SET @sql_hora_inicio = IF(@col_hora_inicio_exists = 0,
  'ALTER TABLE `instalaciones` ADD COLUMN `instalacionHoraInicio` TIME NULL AFTER `instalacionFecha`',
  'SELECT "La columna instalacionHoraInicio ya existe" AS message'
);

PREPARE stmt_hora_inicio FROM @sql_hora_inicio;
EXECUTE stmt_hora_inicio;
DEALLOCATE PREPARE stmt_hora_inicio;

-- ============================================
-- 3. AGREGAR instalacionHoraFinal (TIME)
-- ============================================
SET @col_hora_final_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'instalaciones'
    AND COLUMN_NAME = 'instalacionHoraFinal'
);

SET @sql_hora_final = IF(@col_hora_final_exists = 0,
  'ALTER TABLE `instalaciones` ADD COLUMN `instalacionHoraFinal` TIME NULL AFTER `instalacionHoraInicio`',
  'SELECT "La columna instalacionHoraFinal ya existe" AS message'
);

PREPARE stmt_hora_final FROM @sql_hora_final;
EXECUTE stmt_hora_final;
DEALLOCATE PREPARE stmt_hora_final;

-- ============================================
-- 4. MIGRAR DATOS EXISTENTES
-- ============================================
-- Migrar datos de instalacionFechaHora a los nuevos campos
UPDATE `instalaciones`
SET 
  `instalacionFecha` = DATE(`instalacionFechaHora`),
  `instalacionHoraInicio` = TIME(`instalacionFechaHora`),
  `instalacionHoraFinal` = NULL
WHERE `instalacionFechaHora` IS NOT NULL
  AND `instalacionFecha` IS NULL;

-- Mensaje final
SELECT 'Migración completada. Campos instalacionFecha, instalacionHoraInicio e instalacionHoraFinal agregados y datos migrados.' AS resultado;

