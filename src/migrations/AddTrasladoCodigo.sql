-- Migración para agregar la columna trasladoCodigo a la tabla traslados
-- Esta columna permite agrupar múltiples traslados

-- Verificar si la columna existe antes de agregarla
SET @col_exists = (SELECT COUNT(*) 
                   FROM information_schema.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = 'traslados' 
                   AND COLUMN_NAME = 'trasladoCodigo');

SET @sql_add_col = IF(@col_exists = 0,
    'ALTER TABLE traslados ADD COLUMN trasladoCodigo VARCHAR(100) NULL AFTER trasladoObservaciones',
    'SELECT "La columna trasladoCodigo ya existe en la tabla traslados" AS message');

PREPARE stmt_col FROM @sql_add_col;
EXECUTE stmt_col;
DEALLOCATE PREPARE stmt_col;

-- Agregar índice si la columna se agregó
SET @col_exists_after = (SELECT COUNT(*) 
                         FROM information_schema.COLUMNS 
                         WHERE TABLE_SCHEMA = DATABASE()
                         AND TABLE_NAME = 'traslados' 
                         AND COLUMN_NAME = 'trasladoCodigo');

SET @idx_exists = (SELECT COUNT(*) 
                   FROM information_schema.STATISTICS 
                   WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = 'traslados' 
                   AND INDEX_NAME = 'idx_traslados_trasladoCodigo');

SET @sql_add_idx = IF(@col_exists_after > 0 AND @idx_exists = 0,
    'CREATE INDEX idx_traslados_trasladoCodigo ON traslados(trasladoCodigo)',
    'SELECT "El índice ya existe o la columna no se pudo agregar" AS message');

PREPARE stmt_idx FROM @sql_add_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;
