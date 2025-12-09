-- Script para crear las tablas faltantes: inventario_tecnicos e instalaciones_materiales

-- ============================================
-- CREAR TABLA INVENTARIO_TECNICOS
-- ============================================
CREATE TABLE IF NOT EXISTS `inventario_tecnicos` (
  `inventarioTecnicoId` INT NOT NULL AUTO_INCREMENT,
  `usuarioId` INT NOT NULL,
  `materialId` INT NOT NULL,
  `cantidad` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `fechaCreacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`inventarioTecnicoId`),
  UNIQUE KEY `UQ_usuario_material` (`usuarioId`, `materialId`),
  INDEX `idx_inventario_tecnicos_usuario` (`usuarioId`),
  INDEX `idx_inventario_tecnicos_material` (`materialId`),
  CONSTRAINT `FK_inventario_tecnicos_usuario` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios` (`usuarioId`) ON DELETE CASCADE,
  CONSTRAINT `FK_inventario_tecnicos_material` FOREIGN KEY (`materialId`) REFERENCES `materiales` (`materialId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- CREAR TABLA INSTALACIONES_MATERIALES
-- ============================================
CREATE TABLE IF NOT EXISTS `instalaciones_materiales` (
  `instalacionMaterialId` INT NOT NULL AUTO_INCREMENT,
  `instalacionId` INT NOT NULL,
  `materialId` INT NOT NULL,
  `cantidad` DECIMAL(10, 2) NOT NULL,
  `observaciones` TEXT NULL,
  `fechaCreacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`instalacionMaterialId`),
  INDEX `idx_instalaciones_materiales_instalacion` (`instalacionId`),
  INDEX `idx_instalaciones_materiales_material` (`materialId`),
  CONSTRAINT `FK_instalaciones_materiales_instalacion` FOREIGN KEY (`instalacionId`) REFERENCES `instalaciones` (`instalacionId`) ON DELETE CASCADE,
  CONSTRAINT `FK_instalaciones_materiales_material` FOREIGN KEY (`materialId`) REFERENCES `materiales` (`materialId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

