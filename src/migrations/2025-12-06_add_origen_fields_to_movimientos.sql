-- Migración para agregar campos origenTipo y tecnicoOrigenId a la tabla movimientos_inventario
-- Fecha: 2025-12-06
-- Descripción: Agregar campos para rastrear el origen de los movimientos (bodega o técnico)

-- Verificar si la columna origenTipo ya existe antes de agregarla
SET @col_origen_tipo_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'movimientos_inventario'
    AND COLUMN_NAME = 'origenTipo'
);

SET @sql_origen_tipo = IF(@col_origen_tipo_exists = 0,
    'ALTER TABLE `movimientos_inventario` ADD COLUMN `origenTipo` ENUM(''bodega'', ''tecnico'') NULL AFTER `estadoMovimientoId`',
    'SELECT "La columna origenTipo ya existe" AS message'
);

PREPARE stmt_origen_tipo FROM @sql_origen_tipo;
EXECUTE stmt_origen_tipo;
DEALLOCATE PREPARE stmt_origen_tipo;

-- Verificar si la columna tecnicoOrigenId ya existe antes de agregarla
SET @col_tecnico_origen_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'movimientos_inventario'
    AND COLUMN_NAME = 'tecnicoOrigenId'
);

SET @sql_tecnico_origen = IF(@col_tecnico_origen_exists = 0,
    'ALTER TABLE `movimientos_inventario` ADD COLUMN `tecnicoOrigenId` INT NULL AFTER `origenTipo`',
    'SELECT "La columna tecnicoOrigenId ya existe" AS message'
);

PREPARE stmt_tecnico_origen FROM @sql_tecnico_origen;
EXECUTE stmt_tecnico_origen;
DEALLOCATE PREPARE stmt_tecnico_origen;

-- Agregar índice para tecnicoOrigenId si no existe
SET @idx_tecnico_origen_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'movimientos_inventario'
    AND INDEX_NAME = 'idx_movimientos_tecnico_origen'
);

SET @sql_idx_tecnico_origen = IF(@idx_tecnico_origen_exists = 0,
    'CREATE INDEX `idx_movimientos_tecnico_origen` ON `movimientos_inventario`(`tecnicoOrigenId`)',
    'SELECT "El índice idx_movimientos_tecnico_origen ya existe" AS message'
);

PREPARE stmt_idx_tecnico_origen FROM @sql_idx_tecnico_origen;
EXECUTE stmt_idx_tecnico_origen;
DEALLOCATE PREPARE stmt_idx_tecnico_origen;

-- Agregar foreign key para tecnicoOrigenId si no existe
SET @fk_tecnico_origen_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'movimientos_inventario'
    AND CONSTRAINT_NAME = 'FK_movimientos_tecnico_origen'
);

SET @sql_fk_tecnico_origen = IF(@fk_tecnico_origen_exists = 0,
    'ALTER TABLE `movimientos_inventario` ADD CONSTRAINT `FK_movimientos_tecnico_origen` FOREIGN KEY (`tecnicoOrigenId`) REFERENCES `usuarios` (`usuarioId`) ON DELETE SET NULL',
    'SELECT "La foreign key FK_movimientos_tecnico_origen ya existe" AS message'
);

PREPARE stmt_fk_tecnico_origen FROM @sql_fk_tecnico_origen;
EXECUTE stmt_fk_tecnico_origen;
DEALLOCATE PREPARE stmt_fk_tecnico_origen;

