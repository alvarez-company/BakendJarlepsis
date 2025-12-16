-- ============================================
-- AGREGAR CAMPO NUMEROS_MEDIDOR A TRASLADOS
-- ============================================
-- Agregar campo para guardar números de medidor en traslados

ALTER TABLE `traslados` 
ADD COLUMN `numerosMedidor` JSON NULL AFTER `identificadorUnico`;
