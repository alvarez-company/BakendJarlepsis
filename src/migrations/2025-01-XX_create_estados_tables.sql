-- Crear tablas de estados para normalización
-- Esto permite agregar nuevos estados sin modificar la estructura de las tablas principales

-- Tabla de estados de instalación
CREATE TABLE IF NOT EXISTS `estados_instalacion` (
  `estadoInstalacionId` INT NOT NULL AUTO_INCREMENT,
  `estadoCodigo` VARCHAR(50) NOT NULL UNIQUE,
  `estadoNombre` VARCHAR(100) NOT NULL,
  `estadoDescripcion` TEXT NULL,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `fechaCreacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fechaActualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`estadoInstalacionId`),
  INDEX `idx_estado_codigo` (`estadoCodigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de estados de cliente
CREATE TABLE IF NOT EXISTS `estados_cliente` (
  `estadoClienteId` INT NOT NULL AUTO_INCREMENT,
  `estadoCodigo` VARCHAR(50) NOT NULL UNIQUE,
  `estadoNombre` VARCHAR(100) NOT NULL,
  `estadoDescripcion` TEXT NULL,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `fechaCreacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fechaActualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`estadoClienteId`),
  INDEX `idx_estado_codigo` (`estadoCodigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de estados de movimiento
CREATE TABLE IF NOT EXISTS `estados_movimiento` (
  `estadoMovimientoId` INT NOT NULL AUTO_INCREMENT,
  `estadoCodigo` VARCHAR(50) NOT NULL UNIQUE,
  `estadoNombre` VARCHAR(100) NOT NULL,
  `estadoDescripcion` TEXT NULL,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `fechaCreacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fechaActualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`estadoMovimientoId`),
  INDEX `idx_estado_codigo` (`estadoCodigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de estados de traslado
CREATE TABLE IF NOT EXISTS `estados_traslado` (
  `estadoTrasladoId` INT NOT NULL AUTO_INCREMENT,
  `estadoCodigo` VARCHAR(50) NOT NULL UNIQUE,
  `estadoNombre` VARCHAR(100) NOT NULL,
  `estadoDescripcion` TEXT NULL,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `fechaCreacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fechaActualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`estadoTrasladoId`),
  INDEX `idx_estado_codigo` (`estadoCodigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar estados de instalación
INSERT INTO `estados_instalacion` (`estadoCodigo`, `estadoNombre`, `estadoDescripcion`) VALUES
('pendiente', 'Pendiente', 'Instalación pendiente de asignación'),
('asignacion', 'Asignación', 'Instalación asignada a técnico'),
('en_proceso', 'En Proceso', 'Instalación en proceso'),
('construccion', 'Construcción', 'Instalación en construcción'),
('certificacion', 'Certificación', 'Instalación en certificación'),
('completada', 'Completada', 'Instalación completada'),
('finalizada', 'Finalizada', 'Instalación finalizada'),
('novedad', 'Novedad', 'Instalación con novedad técnica'),
('cancelada', 'Cancelada', 'Instalación cancelada'),
('anulada', 'Anulada', 'Instalación anulada')
ON DUPLICATE KEY UPDATE `estadoNombre` = VALUES(`estadoNombre`);

-- Insertar estados de cliente
INSERT INTO `estados_cliente` (`estadoCodigo`, `estadoNombre`, `estadoDescripcion`) VALUES
('activo', 'Activo', 'Cliente activo sin instalaciones en proceso'),
('instalacion_asignada', 'Instalación Asignada', 'Cliente con instalación asignada'),
('realizando_instalacion', 'Realizando Instalación', 'Cliente con instalación en construcción o certificación')
ON DUPLICATE KEY UPDATE `estadoNombre` = VALUES(`estadoNombre`);

-- Insertar estados de movimiento
INSERT INTO `estados_movimiento` (`estadoCodigo`, `estadoNombre`, `estadoDescripcion`) VALUES
('pendiente', 'Pendiente', 'Movimiento pendiente'),
('completada', 'Completada', 'Movimiento completado'),
('cancelada', 'Cancelada', 'Movimiento cancelado')
ON DUPLICATE KEY UPDATE `estadoNombre` = VALUES(`estadoNombre`);

-- Insertar estados de traslado
INSERT INTO `estados_traslado` (`estadoCodigo`, `estadoNombre`, `estadoDescripcion`) VALUES
('pendiente', 'Pendiente', 'Traslado pendiente'),
('en_transito', 'En Tránsito', 'Traslado en tránsito'),
('completado', 'Completado', 'Traslado completado'),
('cancelado', 'Cancelado', 'Traslado cancelado')
ON DUPLICATE KEY UPDATE `estadoNombre` = VALUES(`estadoNombre`);

