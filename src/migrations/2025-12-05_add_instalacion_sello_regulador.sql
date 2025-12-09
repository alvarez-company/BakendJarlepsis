-- Migración para agregar campo instalacionSelloRegulador a la tabla instalaciones
-- Fecha: 2025-12-05

-- Agregar columna instalacionSelloRegulador
ALTER TABLE `instalaciones`
  ADD COLUMN `instalacionSelloRegulador` VARCHAR(255) NULL 
  AFTER `instalacionSelloNumero`;

SELECT 'Migración completada. La columna instalacionSelloRegulador ha sido agregada a la tabla instalaciones.' AS resultado;

