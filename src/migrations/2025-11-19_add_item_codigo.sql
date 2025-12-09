-- Migración para agregar campo itemCodigo a items_proyecto

-- Paso 1: Agregar la columna itemCodigo
ALTER TABLE `items_proyecto`
  ADD COLUMN `itemCodigo` VARCHAR(255) NULL 
  AFTER `itemNombre`;

