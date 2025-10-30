-- Agregar tabla de notificaciones
CREATE TABLE IF NOT EXISTS `notificaciones` (
  `notificacionId` int NOT NULL AUTO_INCREMENT,
  `usuarioId` int NOT NULL,
  `tipoNotificacion` enum('mensaje_nuevo','reaccion_mensaje','instalacion_completada','instalacion_asignada','instalacion_en_proceso','instalacion_cancelada','mensaje_respondido','usuario_ingreso_grupo','usuario_salio_grupo') NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `contenido` text NOT NULL,
  `datosAdicionales` json DEFAULT NULL,
  `grupoId` int DEFAULT NULL,
  `instalacionId` int DEFAULT NULL,
  `mensajeId` int DEFAULT NULL,
  `leida` tinyint(1) NOT NULL DEFAULT '0',
  `fechaLectura` datetime DEFAULT NULL,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`notificacionId`),
  KEY `IDX_notificaciones_usuarioId_leida` (`usuarioId`,`leida`),
  KEY `IDX_notificaciones_usuarioId_fechaCreacion` (`usuarioId`,`fechaCreacion`),
  KEY `FK_notificaciones_usuarioId` (`usuarioId`),
  CONSTRAINT `FK_notificaciones_usuarioId` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios` (`usuarioId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Agregar columna estado a instalaciones
ALTER TABLE `instalaciones` 
ADD COLUMN IF NOT EXISTS `estado` enum('pendiente','en_proceso','completada','cancelada') NOT NULL DEFAULT 'pendiente';

