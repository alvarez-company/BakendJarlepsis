-- Agregar columnas oficinaId y bodegaId a la tabla instalaciones
ALTER TABLE `instalaciones` 
ADD COLUMN `oficinaId` INT NULL AFTER `usuarioRegistra`,
ADD COLUMN `bodegaId` INT NULL AFTER `oficinaId`;

-- Agregar índices para mejorar el rendimiento de las consultas
ALTER TABLE `instalaciones` 
ADD INDEX `idx_instalaciones_oficina` (`oficinaId`),
ADD INDEX `idx_instalaciones_bodega` (`bodegaId`);

