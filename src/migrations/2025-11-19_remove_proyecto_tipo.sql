-- Migración para remover tipoProyectoId de proyectos
-- Fecha: 2025-11-19
-- Descripción:
--   - Eliminar columna tipoProyectoId
--   - Eliminar relación con tipos_proyecto

-- Eliminar foreign key constraint
ALTER TABLE proyectos
DROP FOREIGN KEY FK_a1900389f6aa7305d2018fc9e18;

-- Eliminar columna
ALTER TABLE proyectos
DROP COLUMN tipoProyectoId;

