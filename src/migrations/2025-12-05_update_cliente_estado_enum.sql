-- Migración para actualizar el ENUM de clienteEstado
-- Agregar el valor 'instalacion_asignada' al ENUM
-- Fecha: 2025-12-05

-- Actualizar el ENUM para incluir 'instalacion_asignada'
ALTER TABLE `clientes`
  MODIFY COLUMN `clienteEstado` ENUM('activo', 'desactivo', 'realizando_instalacion', 'instalacion_asignada') 
  NOT NULL DEFAULT 'activo';

SELECT 'Migración completada. El ENUM clienteEstado ahora incluye instalacion_asignada.' AS resultado;

