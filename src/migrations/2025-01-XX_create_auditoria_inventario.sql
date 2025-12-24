-- Migración para crear la tabla de auditoría de inventario
-- Fecha: 2025-01-XX
-- Descripción: Tabla para registrar todos los cambios realizados en el inventario

CREATE TABLE IF NOT EXISTS `auditoria_inventario` (
  `auditoriaId` int NOT NULL AUTO_INCREMENT,
  `materialId` int NOT NULL,
  `tipoCambio` enum(
    'creacion_material',
    'actualizacion_material',
    'eliminacion_material',
    'ajuste_stock',
    'distribucion_bodega',
    'movimiento_entrada',
    'movimiento_salida',
    'movimiento_devolucion',
    'traslado',
    'cambio_estado'
  ) NOT NULL,
  `descripcion` text,
  `datosAnteriores` json DEFAULT NULL,
  `datosNuevos` json DEFAULT NULL,
  `cantidadAnterior` decimal(10,2) DEFAULT NULL,
  `cantidadNueva` decimal(10,2) DEFAULT NULL,
  `diferencia` decimal(10,2) DEFAULT NULL,
  `bodegaId` int DEFAULT NULL,
  `usuarioId` int NOT NULL,
  `movimientoId` int DEFAULT NULL,
  `trasladoId` int DEFAULT NULL,
  `observaciones` text,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`auditoriaId`),
  KEY `FK_auditoria_material` (`materialId`),
  KEY `FK_auditoria_usuario` (`usuarioId`),
  KEY `FK_auditoria_bodega` (`bodegaId`),
  KEY `IDX_auditoria_fecha` (`fechaCreacion`),
  KEY `IDX_auditoria_tipo` (`tipoCambio`),
  CONSTRAINT `FK_auditoria_material` FOREIGN KEY (`materialId`) REFERENCES `materiales` (`materialId`) ON DELETE CASCADE,
  CONSTRAINT `FK_auditoria_usuario` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios` (`usuarioId`) ON DELETE CASCADE,
  CONSTRAINT `FK_auditoria_bodega` FOREIGN KEY (`bodegaId`) REFERENCES `bodegas` (`bodegaId`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Tabla auditoria_inventario creada exitosamente' AS resultado;

