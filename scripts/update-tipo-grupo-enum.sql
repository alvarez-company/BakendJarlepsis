-- Script para actualizar el enum tipoGrupo y agregar el valor 'directo'
-- Ejecutar este script en la base de datos MySQL

-- Primero, verificar el tipo actual de la columna
-- SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'grupos' AND COLUMN_NAME = 'tipoGrupo';

-- Actualizar el enum para incluir 'directo'
ALTER TABLE `grupos` 
MODIFY COLUMN `tipoGrupo` ENUM('general', 'sede', 'oficina', 'bodega', 'instalacion', 'directo') 
NOT NULL DEFAULT 'general';

