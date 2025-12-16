-- Migración para eliminar soporte de subcategorías
-- Convierte todas las subcategorías existentes en categorías principales
-- y elimina la columna categoriaPadreId

-- Paso 1: Convertir todas las subcategorías en categorías principales
UPDATE categorias
SET categoriaPadreId = NULL
WHERE categoriaPadreId IS NOT NULL;
