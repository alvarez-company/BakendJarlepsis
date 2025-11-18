-- Migración para agregar inventarioId a la tabla movimientos_inventario
-- Fecha: 2025-11-05
-- Descripción: Agregar columna para relacionar movimientos con inventarios

-- Verificar si la columna ya existe antes de agregarla
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'movimientos_inventario'
    AND COLUMN_NAME = 'inventarioId'
);

-- Agregar columna solo si no existe
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE movimientos_inventario ADD COLUMN inventarioId INT NULL',
  'SELECT "La columna inventarioId ya existe" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar índice si no existe
SET @index_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'movimientos_inventario'
    AND INDEX_NAME = 'idx_movimientos_inventarioId'
);

SET @sql2 = IF(@index_exists = 0,
  'CREATE INDEX idx_movimientos_inventarioId ON movimientos_inventario(inventarioId)',
  'SELECT "El índice ya existe" AS message'
);

PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

