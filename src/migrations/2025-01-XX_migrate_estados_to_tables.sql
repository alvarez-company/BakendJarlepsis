-- Migrar datos de estados ENUM a tablas separadas
-- Agregar columnas de referencia a las tablas de estados

-- 1. Estados de Instalación
ALTER TABLE `instalaciones`
  ADD COLUMN `estadoInstalacionId` INT NULL AFTER `estado`,
  ADD INDEX `idx_estado_instalacion_id` (`estadoInstalacionId`),
  ADD CONSTRAINT `fk_instalacion_estado` 
    FOREIGN KEY (`estadoInstalacionId`) 
    REFERENCES `estados_instalacion` (`estadoInstalacionId`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migrar datos existentes
UPDATE `instalaciones` i
INNER JOIN `estados_instalacion` e ON e.estadoCodigo = i.estado
SET i.estadoInstalacionId = e.estadoInstalacionId
WHERE i.estado IS NOT NULL;

-- 2. Estados de Cliente
ALTER TABLE `clientes`
  ADD COLUMN `estadoClienteId` INT NULL AFTER `clienteEstado`,
  ADD INDEX `idx_estado_cliente_id` (`estadoClienteId`),
  ADD CONSTRAINT `fk_cliente_estado` 
    FOREIGN KEY (`estadoClienteId`) 
    REFERENCES `estados_cliente` (`estadoClienteId`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migrar datos existentes
UPDATE `clientes` c
INNER JOIN `estados_cliente` e ON e.estadoCodigo = c.clienteEstado
SET c.estadoClienteId = e.estadoClienteId
WHERE c.clienteEstado IS NOT NULL;

-- 3. Estados de Movimiento
ALTER TABLE `movimientos_inventario`
  ADD COLUMN `estadoMovimientoId` INT NULL AFTER `movimientoEstado`,
  ADD INDEX `idx_estado_movimiento_id` (`estadoMovimientoId`),
  ADD CONSTRAINT `fk_movimiento_estado` 
    FOREIGN KEY (`estadoMovimientoId`) 
    REFERENCES `estados_movimiento` (`estadoMovimientoId`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migrar datos existentes
UPDATE `movimientos_inventario` m
INNER JOIN `estados_movimiento` e ON e.estadoCodigo = m.movimientoEstado
SET m.estadoMovimientoId = e.estadoMovimientoId
WHERE m.movimientoEstado IS NOT NULL;

-- 4. Estados de Traslado
ALTER TABLE `traslados`
  ADD COLUMN `estadoTrasladoId` INT NULL AFTER `trasladoEstado`,
  ADD INDEX `idx_estado_traslado_id` (`estadoTrasladoId`),
  ADD CONSTRAINT `fk_traslado_estado` 
    FOREIGN KEY (`estadoTrasladoId`) 
    REFERENCES `estados_traslado` (`estadoTrasladoId`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migrar datos existentes
UPDATE `traslados` t
INNER JOIN `estados_traslado` e ON e.estadoCodigo = t.trasladoEstado
SET t.estadoTrasladoId = e.estadoTrasladoId
WHERE t.trasladoEstado IS NOT NULL;

