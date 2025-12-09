-- Migración para remover materialId e itemCantidad de items_proyecto
-- Fecha: 2025-11-19
-- Descripción:
--   - Eliminar columna materialId
--   - Eliminar columna itemCantidad
--   - Eliminar relación con materiales

-- Eliminar foreign key constraint
ALTER TABLE items_proyecto
DROP FOREIGN KEY FK_b4f373909da9224964e354e155c;

-- Eliminar columnas
ALTER TABLE items_proyecto
DROP COLUMN materialId,
DROP COLUMN itemCantidad;

