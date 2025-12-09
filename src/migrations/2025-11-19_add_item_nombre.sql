-- Migración para agregar campo itemNombre a items_proyecto
-- Fecha: 2025-11-19
-- Descripción:
--   - Agregar columna itemNombre (VARCHAR) después de materialId
--   - Hacer el campo obligatorio

ALTER TABLE items_proyecto
ADD COLUMN itemNombre VARCHAR(255) NOT NULL DEFAULT '' AFTER materialId;

-- Actualizar items existentes con un nombre por defecto basado en el material
UPDATE items_proyecto ip
INNER JOIN materiales m ON ip.materialId = m.materialId
SET ip.itemNombre = CONCAT('Item de ', m.materialNombre)
WHERE ip.itemNombre = '';

