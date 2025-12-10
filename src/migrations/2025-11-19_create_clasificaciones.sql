-- Migración para crear tabla clasificaciones

CREATE TABLE IF NOT EXISTS `clasificaciones` (
  `clasificacionId` INT NOT NULL AUTO_INCREMENT,
  `clasificacionNombre` VARCHAR(255) NOT NULL,
  `clasificacionDescripcion` TEXT NULL,
  `clasificacionEstado` TINYINT NOT NULL DEFAULT 1,
  `usuarioRegistra` INT NULL,
  `fechaCreacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`clasificacionId`),
  UNIQUE KEY `clasificacionNombre` (`clasificacionNombre`),
  KEY `FK_clasificacion_usuario` (`usuarioRegistra`),
  CONSTRAINT `FK_clasificacion_usuario` FOREIGN KEY (`usuarioRegistra`) REFERENCES `usuarios` (`usuarioId`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

