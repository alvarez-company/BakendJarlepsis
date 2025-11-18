-- Migración para agregar materialPadreId a la tabla materiales
-- Fecha: 2025-11-05
-- Descripción:
--   1. Agregar columna materialPadreId nullable
--   2. Agregar índice para mejorar búsquedas de variantes

-- Agregar columna materialPadreId
ALTER TABLE materiales
ADD COLUMN materialPadreId INT NULL;

-- Agregar índice para mejorar búsquedas
CREATE INDEX idx_materiales_materialPadreId ON materiales(materialPadreId);

-- Agregar foreign key constraint
ALTER TABLE materiales
ADD CONSTRAINT fk_materiales_materialPadre
FOREIGN KEY (materialPadreId) REFERENCES materiales(materialId)
ON DELETE SET NULL;

