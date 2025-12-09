-- Migración para agregar campos de fecha para estados legacy de instalaciones
-- Fecha: 2025-01-XX
-- Descripción: Agregar columnas fechaAsignacion, fechaConstruccion, fechaCertificacion, fechaAnulacion, fechaNovedad

-- Verificar y agregar fechaAsignacion
SET @col_fecha_asignacion_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'instalaciones'
    AND COLUMN_NAME = 'fechaAsignacion'
);

SET @sql_fecha_asignacion = IF(@col_fecha_asignacion_exists = 0,
  'ALTER TABLE `instalaciones` ADD COLUMN `fechaAsignacion` DATETIME NULL AFTER `instalacionFechaHora`',
  'SELECT "La columna fechaAsignacion ya existe" AS message'
);

PREPARE stmt_fecha_asignacion FROM @sql_fecha_asignacion;
EXECUTE stmt_fecha_asignacion;
DEALLOCATE PREPARE stmt_fecha_asignacion;

-- Verificar y agregar fechaConstruccion
SET @col_fecha_construccion_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'instalaciones'
    AND COLUMN_NAME = 'fechaConstruccion'
);

SET @sql_fecha_construccion = IF(@col_fecha_construccion_exists = 0,
  'ALTER TABLE `instalaciones` ADD COLUMN `fechaConstruccion` DATETIME NULL AFTER `fechaAsignacion`',
  'SELECT "La columna fechaConstruccion ya existe" AS message'
);

PREPARE stmt_fecha_construccion FROM @sql_fecha_construccion;
EXECUTE stmt_fecha_construccion;
DEALLOCATE PREPARE stmt_fecha_construccion;

-- Verificar y agregar fechaCertificacion
SET @col_fecha_certificacion_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'instalaciones'
    AND COLUMN_NAME = 'fechaCertificacion'
);

SET @sql_fecha_certificacion = IF(@col_fecha_certificacion_exists = 0,
  'ALTER TABLE `instalaciones` ADD COLUMN `fechaCertificacion` DATETIME NULL AFTER `fechaConstruccion`',
  'SELECT "La columna fechaCertificacion ya existe" AS message'
);

PREPARE stmt_fecha_certificacion FROM @sql_fecha_certificacion;
EXECUTE stmt_fecha_certificacion;
DEALLOCATE PREPARE stmt_fecha_certificacion;

-- Verificar y agregar fechaAnulacion
SET @col_fecha_anulacion_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'instalaciones'
    AND COLUMN_NAME = 'fechaAnulacion'
);

SET @sql_fecha_anulacion = IF(@col_fecha_anulacion_exists = 0,
  'ALTER TABLE `instalaciones` ADD COLUMN `fechaAnulacion` DATETIME NULL AFTER `fechaCertificacion`',
  'SELECT "La columna fechaAnulacion ya existe" AS message'
);

PREPARE stmt_fecha_anulacion FROM @sql_fecha_anulacion;
EXECUTE stmt_fecha_anulacion;
DEALLOCATE PREPARE stmt_fecha_anulacion;

-- Verificar y agregar fechaNovedad
SET @col_fecha_novedad_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'instalaciones'
    AND COLUMN_NAME = 'fechaNovedad'
);

SET @sql_fecha_novedad = IF(@col_fecha_novedad_exists = 0,
  'ALTER TABLE `instalaciones` ADD COLUMN `fechaNovedad` DATETIME NULL AFTER `fechaAnulacion`',
  'SELECT "La columna fechaNovedad ya existe" AS message'
);

PREPARE stmt_fecha_novedad FROM @sql_fecha_novedad;
EXECUTE stmt_fecha_novedad;
DEALLOCATE PREPARE stmt_fecha_novedad;

SELECT 'Migración completada. Las columnas de fecha para estados legacy han sido agregadas.' AS resultado;

