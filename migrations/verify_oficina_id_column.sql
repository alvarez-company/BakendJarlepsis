-- Script para verificar si la columna oficinaId existe en movimientos_inventario
-- Ejecutar este script para verificar la estructura de la tabla

-- Verificar estructura de la tabla
DESCRIBE movimientos_inventario;

-- O verificar con SHOW COLUMNS
SHOW COLUMNS FROM movimientos_inventario LIKE 'oficinaId';

-- Si no existe, ejecutar:
-- ALTER TABLE movimientos_inventario 
-- ADD COLUMN oficinaId INT NULL AFTER movimientoCodigo;
--
-- CREATE INDEX idx_movimientos_oficina ON movimientos_inventario(oficinaId);

