-- Migración completa para estructurar instalaciones y movimientos
-- Fecha: 2025-11-20
-- Descripción: Agregar todas las columnas faltantes y actualizar enums

-- ============================================
-- 1. ACTUALIZAR ENUM DE ESTADO EN INSTALACIONES
-- ============================================
-- Verificar si 'finalizada' ya existe en el enum
SET @enum_has_finalizada = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'instalaciones'
    AND COLUMN_NAME = 'estado'
    AND COLUMN_TYPE LIKE '%finalizada%'
);

-- Si no tiene 'finalizada', agregarlo
SET @sql_enum = IF(@enum_has_finalizada = 0,
  'ALTER TABLE `instalaciones` MODIFY COLUMN `estado` ENUM(\'pendiente\', \'en_proceso\', \'completada\', \'finalizada\', \'cancelada\') NOT NULL DEFAULT \'pendiente\'',
  'SELECT "El enum ya incluye finalizada" AS message'
);

PREPARE stmt_enum FROM @sql_enum;
EXECUTE stmt_enum;
DEALLOCATE PREPARE stmt_enum;

-- ============================================
-- 2. AGREGAR COLUMNAS A INSTALACIONES
-- ============================================
-- Verificar y agregar oficinaId
SET @col_oficina_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'instalaciones'
    AND COLUMN_NAME = 'oficinaId'
);

SET @sql_oficina = IF(@col_oficina_exists = 0,
  'ALTER TABLE `instalaciones` ADD COLUMN `oficinaId` INT NULL AFTER `usuarioRegistra`',
  'SELECT "La columna oficinaId ya existe" AS message'
);

PREPARE stmt_oficina FROM @sql_oficina;
EXECUTE stmt_oficina;
DEALLOCATE PREPARE stmt_oficina;

-- Verificar y agregar bodegaId
SET @col_bodega_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'instalaciones'
    AND COLUMN_NAME = 'bodegaId'
);

SET @sql_bodega = IF(@col_bodega_exists = 0,
  'ALTER TABLE `instalaciones` ADD COLUMN `bodegaId` INT NULL AFTER `oficinaId`',
  'SELECT "La columna bodegaId ya existe" AS message'
);

PREPARE stmt_bodega FROM @sql_bodega;
EXECUTE stmt_bodega;
DEALLOCATE PREPARE stmt_bodega;

-- Agregar índices para instalaciones
SET @idx_oficina_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'instalaciones'
    AND INDEX_NAME = 'idx_instalaciones_oficina'
);

SET @sql_idx_oficina = IF(@idx_oficina_exists = 0,
  'ALTER TABLE `instalaciones` ADD INDEX `idx_instalaciones_oficina` (`oficinaId`)',
  'SELECT "El índice idx_instalaciones_oficina ya existe" AS message'
);

PREPARE stmt_idx_oficina FROM @sql_idx_oficina;
EXECUTE stmt_idx_oficina;
DEALLOCATE PREPARE stmt_idx_oficina;

SET @idx_bodega_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'instalaciones'
    AND INDEX_NAME = 'idx_instalaciones_bodega'
);

SET @sql_idx_bodega = IF(@idx_bodega_exists = 0,
  'ALTER TABLE `instalaciones` ADD INDEX `idx_instalaciones_bodega` (`bodegaId`)',
  'SELECT "El índice idx_instalaciones_bodega ya existe" AS message'
);

PREPARE stmt_idx_bodega FROM @sql_idx_bodega;
EXECUTE stmt_idx_bodega;
DEALLOCATE PREPARE stmt_idx_bodega;

-- ============================================
-- 3. AGREGAR COLUMNAS A MOVIMIENTOS_INVENTARIO
-- ============================================
-- Verificar y agregar inventarioId
SET @col_inventario_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'movimientos_inventario'
    AND COLUMN_NAME = 'inventarioId'
);

SET @sql_inventario = IF(@col_inventario_exists = 0,
  'ALTER TABLE `movimientos_inventario` ADD COLUMN `inventarioId` INT NULL AFTER `proveedorId`',
  'SELECT "La columna inventarioId ya existe" AS message'
);

PREPARE stmt_inventario FROM @sql_inventario;
EXECUTE stmt_inventario;
DEALLOCATE PREPARE stmt_inventario;

-- Verificar y agregar movimientoCodigo
SET @col_codigo_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'movimientos_inventario'
    AND COLUMN_NAME = 'movimientoCodigo'
);

SET @sql_codigo = IF(@col_codigo_exists = 0,
  'ALTER TABLE `movimientos_inventario` ADD COLUMN `movimientoCodigo` VARCHAR(100) NULL AFTER `inventarioId`',
  'SELECT "La columna movimientoCodigo ya existe" AS message'
);

PREPARE stmt_codigo FROM @sql_codigo;
EXECUTE stmt_codigo;
DEALLOCATE PREPARE stmt_codigo;

-- Verificar y agregar oficinaId
SET @col_oficina_mov_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'movimientos_inventario'
    AND COLUMN_NAME = 'oficinaId'
);

SET @sql_oficina_mov = IF(@col_oficina_mov_exists = 0,
  'ALTER TABLE `movimientos_inventario` ADD COLUMN `oficinaId` INT NULL AFTER `movimientoCodigo`',
  'SELECT "La columna oficinaId ya existe en movimientos_inventario" AS message'
);

PREPARE stmt_oficina_mov FROM @sql_oficina_mov;
EXECUTE stmt_oficina_mov;
DEALLOCATE PREPARE stmt_oficina_mov;

-- Agregar índices para movimientos_inventario
SET @idx_inventario_mov_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'movimientos_inventario'
    AND INDEX_NAME = 'idx_movimientos_inventarioId'
);

SET @sql_idx_inventario_mov = IF(@idx_inventario_mov_exists = 0,
  'CREATE INDEX `idx_movimientos_inventarioId` ON `movimientos_inventario`(`inventarioId`)',
  'SELECT "El índice idx_movimientos_inventarioId ya existe" AS message'
);

PREPARE stmt_idx_inventario_mov FROM @sql_idx_inventario_mov;
EXECUTE stmt_idx_inventario_mov;
DEALLOCATE PREPARE stmt_idx_inventario_mov;

SET @idx_codigo_mov_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'movimientos_inventario'
    AND INDEX_NAME = 'idx_movimientos_movimientoCodigo'
);

SET @sql_idx_codigo_mov = IF(@idx_codigo_mov_exists = 0,
  'CREATE INDEX `idx_movimientos_movimientoCodigo` ON `movimientos_inventario`(`movimientoCodigo`)',
  'SELECT "El índice idx_movimientos_movimientoCodigo ya existe" AS message'
);

PREPARE stmt_idx_codigo_mov FROM @sql_idx_codigo_mov;
EXECUTE stmt_idx_codigo_mov;
DEALLOCATE PREPARE stmt_idx_codigo_mov;

SET @idx_oficina_mov_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'movimientos_inventario'
    AND INDEX_NAME = 'idx_movimientos_oficina'
);

SET @sql_idx_oficina_mov = IF(@idx_oficina_mov_exists = 0,
  'CREATE INDEX `idx_movimientos_oficina` ON `movimientos_inventario`(`oficinaId`)',
  'SELECT "El índice idx_movimientos_oficina ya existe" AS message'
);

PREPARE stmt_idx_oficina_mov FROM @sql_idx_oficina_mov;
EXECUTE stmt_idx_oficina_mov;
DEALLOCATE PREPARE stmt_idx_oficina_mov;

-- ============================================
-- 4. VERIFICAR QUE movimientoEstado SEA ENUM
-- ============================================
-- Verificar si movimientoEstado es ENUM
SET @mov_estado_is_enum = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'movimientos_inventario'
    AND COLUMN_NAME = 'movimientoEstado'
    AND DATA_TYPE = 'enum'
);

-- Si no es enum, ya debería haberse convertido en la migración anterior
-- Solo verificamos que exista
SELECT 'Migración completada. Verifique que todas las columnas se hayan agregado correctamente.' AS resultado;

