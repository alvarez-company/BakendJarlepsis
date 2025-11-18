-- Migración para agregar movimientoCodigo a la tabla movimientos_inventario
-- Fecha: 2025-11-05
-- Descripción: Agregar columna para agrupar múltiples movimientos

-- Agregar columna movimientoCodigo
ALTER TABLE movimientos_inventario
ADD COLUMN movimientoCodigo VARCHAR(100) NULL;

-- Agregar índice para mejorar búsquedas
CREATE INDEX idx_movimientos_movimientoCodigo ON movimientos_inventario(movimientoCodigo);

