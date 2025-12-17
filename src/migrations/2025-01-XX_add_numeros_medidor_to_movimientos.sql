-- ============================================
-- AGREGAR CAMPO NUMEROS_MEDIDOR A MOVIMIENTOS_INVENTARIO
-- ============================================
-- Este campo almacena los números de medidor específicos que fueron usados en cada movimiento

ALTER TABLE `movimientos_inventario`
ADD COLUMN IF NOT EXISTS `numerosMedidor` JSON NULL
AFTER `origenTipo`;

-- Agregar índice para mejorar consultas (opcional, ya que JSON no es muy eficiente para índices)
-- ALTER TABLE `movimientos_inventario`
-- ADD INDEX `idx_movimientos_numeros_medidor` ((CAST(`numerosMedidor` AS CHAR(255) ARRAY)));

