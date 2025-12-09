-- Migración para actualizar el ENUM de estado en instalaciones
-- Agregar todos los estados legacy: asignacion, construccion, certificacion, novedad, anulada
-- Fecha: 2025-12-05

-- Actualizar el ENUM para incluir todos los estados legacy
ALTER TABLE `instalaciones`
  MODIFY COLUMN `estado` ENUM(
    'pendiente',
    'en_proceso',
    'completada',
    'finalizada',
    'cancelada',
    'asignacion',
    'construccion',
    'certificacion',
    'novedad',
    'anulada'
  ) NOT NULL DEFAULT 'pendiente';

SELECT 'Migración completada. El ENUM estado ahora incluye todos los estados legacy.' AS resultado;

