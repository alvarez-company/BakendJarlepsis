-- Migración para cambiar movimientoEstado de boolean a enum
-- Fecha: 2025-11-19
-- Descripción:
--   - Cambiar el tipo de la columna movimientoEstado de BOOLEAN a ENUM
--   - Valores: 'pendiente', 'completada', 'cancelada'
--   - Los valores existentes TRUE se convierten a 'completada', FALSE a 'cancelada'

-- Primero, agregar la columna temporal con el nuevo tipo
ALTER TABLE movimientos_inventario
ADD COLUMN movimientoEstadoTemp ENUM('pendiente', 'completada', 'cancelada') DEFAULT 'completada';

-- Copiar los datos de la columna antigua a la nueva
UPDATE movimientos_inventario
SET movimientoEstadoTemp = 
  CASE 
    WHEN movimientoEstado = 1 OR movimientoEstado = TRUE THEN 'completada'
    WHEN movimientoEstado = 0 OR movimientoEstado = FALSE THEN 'cancelada'
    ELSE 'completada'
  END;

-- Eliminar la columna antigua
ALTER TABLE movimientos_inventario
DROP COLUMN movimientoEstado;

-- Renombrar la columna temporal a movimientoEstado
ALTER TABLE movimientos_inventario
CHANGE COLUMN movimientoEstadoTemp movimientoEstado ENUM('pendiente', 'completada', 'cancelada') DEFAULT 'completada';

