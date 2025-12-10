-- Migración para agregar campo de estado al cliente
-- Estados: activo, desactivo, realizando_instalacion

-- Paso 1: Agregar la columna clienteEstado con enum
ALTER TABLE `clientes`
  ADD COLUMN `clienteEstado` ENUM('activo', 'desactivo', 'realizando_instalacion') 
  NOT NULL DEFAULT 'activo' 
  AFTER `cantidadInstalaciones`;

-- Paso 2: Actualizar todos los registros existentes a 'activo' por defecto
UPDATE `clientes`
SET `clienteEstado` = 'activo'
WHERE `clienteEstado` IS NULL;

