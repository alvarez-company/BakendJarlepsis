-- ============================================
-- CREAR TABLA NUMEROS_MEDIDOR
-- ============================================
-- Esta tabla rastrea números de medidor individuales para materiales de categoría "Medidores"
-- Cada unidad de medidor tiene un número único que se rastrea cuando sale del inventario,
-- se asigna a un técnico, o se usa en una instalación

CREATE TABLE IF NOT EXISTS `numeros_medidor` (
  `numeroMedidorId` INT NOT NULL AUTO_INCREMENT,
  `materialId` INT NOT NULL,
  `numeroMedidor` VARCHAR(255) NOT NULL,
  `estado` ENUM('disponible', 'asignado_tecnico', 'en_instalacion', 'instalado') NOT NULL DEFAULT 'disponible',
  `inventarioTecnicoId` INT NULL,
  `instalacionMaterialId` INT NULL,
  `usuarioId` INT NULL,
  `instalacionId` INT NULL,
  `observaciones` TEXT NULL,
  `fechaCreacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`numeroMedidorId`),
  UNIQUE KEY `UQ_numero_medidor` (`numeroMedidor`),
  INDEX `idx_numeros_medidor_material` (`materialId`),
  INDEX `idx_numeros_medidor_usuario` (`usuarioId`),
  INDEX `idx_numeros_medidor_instalacion` (`instalacionId`),
  INDEX `idx_numeros_medidor_estado` (`estado`),
  INDEX `idx_numeros_medidor_inventario_tecnico` (`inventarioTecnicoId`),
  INDEX `idx_numeros_medidor_instalacion_material` (`instalacionMaterialId`),
  CONSTRAINT `FK_numeros_medidor_material` FOREIGN KEY (`materialId`) REFERENCES `materiales` (`materialId`) ON DELETE CASCADE,
  CONSTRAINT `FK_numeros_medidor_inventario_tecnico` FOREIGN KEY (`inventarioTecnicoId`) REFERENCES `inventario_tecnicos` (`inventarioTecnicoId`) ON DELETE SET NULL,
  CONSTRAINT `FK_numeros_medidor_instalacion_material` FOREIGN KEY (`instalacionMaterialId`) REFERENCES `instalaciones_materiales` (`instalacionMaterialId`) ON DELETE SET NULL,
  CONSTRAINT `FK_numeros_medidor_usuario` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios` (`usuarioId`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
