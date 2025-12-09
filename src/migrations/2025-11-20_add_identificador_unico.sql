-- Migración para agregar campo identificadorUnico a instalaciones, movimientos_inventario y traslados
-- Fecha: 2025-11-20
-- Descripción: Agregar campo identificadorUnico autogenerado para cada tipo de registro

-- ============================================
-- 1. AGREGAR identificadorUnico A INSTALACIONES
-- ============================================
SET @col_instalacion_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'instalaciones'
    AND COLUMN_NAME = 'identificadorUnico'
);

SET @sql_instalacion = IF(@col_instalacion_exists = 0,
  'ALTER TABLE `instalaciones` ADD COLUMN `identificadorUnico` VARCHAR(50) NULL UNIQUE AFTER `instalacionCodigo`',
  'SELECT "La columna identificadorUnico ya existe en instalaciones" AS message'
);

PREPARE stmt_instalacion FROM @sql_instalacion;
EXECUTE stmt_instalacion;
DEALLOCATE PREPARE stmt_instalacion;

-- Crear índice único si no existe
SET @index_instalacion_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'instalaciones' AND INDEX_NAME = 'idx_instalaciones_identificador_unico');
SET @sql_index_instalacion = IF(@index_instalacion_exists = 0, 'CREATE UNIQUE INDEX `idx_instalaciones_identificador_unico` ON `instalaciones` (`identificadorUnico`)', 'SELECT "El índice idx_instalaciones_identificador_unico ya existe" AS message');
PREPARE stmt_index_instalacion FROM @sql_index_instalacion; EXECUTE stmt_index_instalacion; DEALLOCATE PREPARE stmt_index_instalacion;

-- ============================================
-- 2. AGREGAR identificadorUnico A MOVIMIENTOS_INVENTARIO
-- ============================================
SET @col_movimiento_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'movimientos_inventario'
    AND COLUMN_NAME = 'identificadorUnico'
);

SET @sql_movimiento = IF(@col_movimiento_exists = 0,
  'ALTER TABLE `movimientos_inventario` ADD COLUMN `identificadorUnico` VARCHAR(50) NULL UNIQUE AFTER `movimientoCodigo`',
  'SELECT "La columna identificadorUnico ya existe en movimientos_inventario" AS message'
);

PREPARE stmt_movimiento FROM @sql_movimiento;
EXECUTE stmt_movimiento;
DEALLOCATE PREPARE stmt_movimiento;

-- Crear índice único si no existe
SET @index_movimiento_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'movimientos_inventario' AND INDEX_NAME = 'idx_movimientos_identificador_unico');
SET @sql_index_movimiento = IF(@index_movimiento_exists = 0, 'CREATE UNIQUE INDEX `idx_movimientos_identificador_unico` ON `movimientos_inventario` (`identificadorUnico`)', 'SELECT "El índice idx_movimientos_identificador_unico ya existe" AS message');
PREPARE stmt_index_movimiento FROM @sql_index_movimiento; EXECUTE stmt_index_movimiento; DEALLOCATE PREPARE stmt_index_movimiento;

-- ============================================
-- 3. AGREGAR identificadorUnico A TRASLADOS
-- ============================================
SET @col_traslado_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'traslados'
    AND COLUMN_NAME = 'identificadorUnico'
);

SET @sql_traslado = IF(@col_traslado_exists = 0,
  'ALTER TABLE `traslados` ADD COLUMN `identificadorUnico` VARCHAR(50) NULL UNIQUE AFTER `trasladoCodigo`',
  'SELECT "La columna identificadorUnico ya existe en traslados" AS message'
);

PREPARE stmt_traslado FROM @sql_traslado;
EXECUTE stmt_traslado;
DEALLOCATE PREPARE stmt_traslado;

-- Crear índice único si no existe
SET @index_traslado_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'traslados' AND INDEX_NAME = 'idx_traslados_identificador_unico');
SET @sql_index_traslado = IF(@index_traslado_exists = 0, 'CREATE UNIQUE INDEX `idx_traslados_identificador_unico` ON `traslados` (`identificadorUnico`)', 'SELECT "El índice idx_traslados_identificador_unico ya existe" AS message');
PREPARE stmt_index_traslado FROM @sql_index_traslado; EXECUTE stmt_index_traslado; DEALLOCATE PREPARE stmt_index_traslado;

SELECT 'Migración completada. Verifique que todas las columnas identificadorUnico se hayan agregado correctamente.' AS resultado;

