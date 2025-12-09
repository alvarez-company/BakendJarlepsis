-- Crear tabla de auditoría para eliminaciones
CREATE TABLE IF NOT EXISTS `auditoria_eliminaciones` (
  `auditoriaId` INT NOT NULL AUTO_INCREMENT,
  `tipoEntidad` ENUM('movimiento', 'instalacion', 'traslado') NOT NULL,
  `entidadId` INT NOT NULL,
  `datosEliminados` JSON NULL,
  `motivo` TEXT NULL,
  `usuarioId` INT NOT NULL,
  `observaciones` TEXT NULL,
  `fechaEliminacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`auditoriaId`),
  INDEX `idx_tipo_entidad` (`tipoEntidad`),
  INDEX `idx_entidad_id` (`entidadId`),
  INDEX `idx_usuario_id` (`usuarioId`),
  INDEX `idx_fecha_eliminacion` (`fechaEliminacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

