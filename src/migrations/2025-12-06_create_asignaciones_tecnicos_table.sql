-- Crear tabla de asignaciones de técnicos
-- Cada registro representa una asignación completa de materiales de una bodega a un técnico

CREATE TABLE IF NOT EXISTS `asignaciones_tecnicos` (
  `asignacionTecnicoId` INT NOT NULL AUTO_INCREMENT,
  `asignacionCodigo` VARCHAR(255) NOT NULL UNIQUE,
  `usuarioId` INT NOT NULL COMMENT 'Técnico al que se le asignó',
  `inventarioId` INT NOT NULL COMMENT 'Bodega de origen',
  `usuarioAsignadorId` INT NOT NULL COMMENT 'Usuario que hizo la asignación',
  `materiales` JSON NOT NULL COMMENT 'Lista de materiales asignados con cantidades',
  `observaciones` TEXT NULL,
  `fechaCreacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`asignacionTecnicoId`),
  UNIQUE KEY `UQ_asignacion_codigo` (`asignacionCodigo`),
  INDEX `idx_asignaciones_tecnicos_usuario` (`usuarioId`),
  INDEX `idx_asignaciones_tecnicos_inventario` (`inventarioId`),
  INDEX `idx_asignaciones_tecnicos_asignador` (`usuarioAsignadorId`),
  INDEX `idx_asignaciones_tecnicos_fecha` (`fechaCreacion`),
  CONSTRAINT `FK_asignaciones_tecnicos_usuario` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios` (`usuarioId`) ON DELETE CASCADE,
  CONSTRAINT `FK_asignaciones_tecnicos_inventario` FOREIGN KEY (`inventarioId`) REFERENCES `inventarios` (`inventarioId`) ON DELETE CASCADE,
  CONSTRAINT `FK_asignaciones_tecnicos_asignador` FOREIGN KEY (`usuarioAsignadorId`) REFERENCES `usuarios` (`usuarioId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

