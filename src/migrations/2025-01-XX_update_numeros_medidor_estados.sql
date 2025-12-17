-- ============================================
-- ACTUALIZAR ESTADOS DE NUMEROS_MEDIDOR
-- ============================================
-- Migración para actualizar los estados de números de medidor
-- Cambiar 'en_inventario' a 'disponible' y agregar estado 'instalado'

-- Paso 1: Actualizar valores existentes de 'en_inventario' a 'disponible'
UPDATE `numeros_medidor` 
SET `estado` = 'disponible' 
WHERE `estado` = 'en_inventario';

-- Paso 2: Modificar el enum para incluir los nuevos estados
ALTER TABLE `numeros_medidor` 
MODIFY COLUMN `estado` ENUM('disponible', 'asignado_tecnico', 'en_instalacion', 'instalado') NOT NULL DEFAULT 'disponible';
