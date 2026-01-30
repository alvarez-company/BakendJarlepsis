-- ============================================
-- FULL SEED - Esquema auxiliar + datos iniciales (Jarlepsis)
-- ============================================
-- Uso:
--   1. Ejecutar migraciones TypeORM primero: npm run migration:run
--   2. Luego ejecutar este archivo en MySQL:
--      mysql -u root -p jarlepsisdev < src/migrations/full_seed.sql
--   O desde MySQL Workbench / cliente SQL: abrir y ejecutar.
--
-- Opcional (base de datos nueva): descomentar las 3 líneas siguientes
-- para crear la base de datos antes de ejecutar migraciones.
-- DROP DATABASE IF EXISTS `jarlepsisdev`;
-- CREATE DATABASE `jarlepsisdev` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE `jarlepsisdev`;

-- ============================================
-- PARTE 1: TABLAS AUXILIARES (CREATE IF NOT EXISTS)
-- ============================================

-- Tipos de documentos de identidad
CREATE TABLE IF NOT EXISTS `tipos_documentos_identidad` (
  `tipoDocumentoId` INT NOT NULL AUTO_INCREMENT,
  `tipoDocumentoCodigo` VARCHAR(10) NOT NULL,
  `tipoDocumentoNombre` VARCHAR(100) NOT NULL,
  `tipoDocumentoDescripcion` TEXT NULL,
  `tipoDocumentoEstado` TINYINT(1) NOT NULL DEFAULT 1,
  `fechaCreacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tipoDocumentoId`),
  UNIQUE INDEX `IDX_tipoDocumentoCodigo` (`tipoDocumentoCodigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Estados (instalación, cliente, movimiento, traslado)
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

-- Unidades de medida
CREATE TABLE IF NOT EXISTS `unidades_medida` (
  `unidadMedidaId` INT NOT NULL AUTO_INCREMENT,
  `unidadMedidaNombre` VARCHAR(255) NOT NULL,
  `unidadMedidaSimbolo` VARCHAR(255) NULL,
  `unidadMedidaEstado` TINYINT NOT NULL DEFAULT 1,
  `usuarioRegistra` INT NULL,
  `fechaCreacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`unidadMedidaId`),
  UNIQUE KEY `unidadMedidaNombre` (`unidadMedidaNombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Auditoría eliminaciones (tipoEntidad incluye 'asignacion')
CREATE TABLE IF NOT EXISTS `auditoria_eliminaciones` (
  `auditoriaId` INT NOT NULL AUTO_INCREMENT,
  `tipoEntidad` ENUM('movimiento', 'instalacion', 'traslado', 'asignacion') NOT NULL,
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

-- Auditoría inventario (requiere tablas materiales, usuarios, bodegas)
CREATE TABLE IF NOT EXISTS `auditoria_inventario` (
  `auditoriaId` INT NOT NULL AUTO_INCREMENT,
  `materialId` INT NOT NULL,
  `tipoCambio` ENUM(
    'creacion_material', 'actualizacion_material', 'eliminacion_material',
    'ajuste_stock', 'distribucion_bodega', 'movimiento_entrada', 'movimiento_salida',
    'movimiento_devolucion', 'traslado', 'cambio_estado'
  ) NOT NULL,
  `descripcion` TEXT NULL,
  `datosAnteriores` JSON NULL,
  `datosNuevos` JSON NULL,
  `cantidadAnterior` DECIMAL(10,2) NULL,
  `cantidadNueva` DECIMAL(10,2) NULL,
  `diferencia` DECIMAL(10,2) NULL,
  `bodegaId` INT NULL,
  `usuarioId` INT NOT NULL,
  `movimientoId` INT NULL,
  `trasladoId` INT NULL,
  `observaciones` TEXT NULL,
  `fechaCreacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
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

-- Clasificaciones (requiere usuarios)
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

-- numeros_medidor (requiere materiales, usuarios; opcional inventario_tecnicos, instalaciones_materiales)
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
  CONSTRAINT `FK_numeros_medidor_usuario` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios` (`usuarioId`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PARTE 2: DATOS INICIALES
-- ============================================

-- 2.1 ROLES (INSERT con ON DUPLICATE KEY por rolNombre/rolTipo según tabla)
INSERT INTO `roles` (`rolNombre`, `rolTipo`, `rolDescripcion`, `rolEstado`, `fechaCreacion`, `fechaActualizacion`) VALUES
('Super Administrador', 'superadmin', 'Administrador con todos los permisos incluyendo cambio de roles', 1, NOW(), NOW()),
('Administrador', 'admin', 'Administrador de oficina con permisos completos excepto cambio de roles', 1, NOW(), NOW()),
('Administrador - Centro Operativo', 'administrador', 'Usuario con acceso de solo lectura a la información del centro operativo. No puede editar ni eliminar datos.', 1, NOW(), NOW()),
('Administrador de Internas', 'admin-internas', 'Mismos permisos que administrador pero con acceso solo a bodegas de tipo internas de su centro operativo.', 1, NOW(), NOW()),
('Administrador de Redes', 'admin-redes', 'Mismos permisos que administrador pero con acceso solo a bodegas de tipo redes de su centro operativo.', 1, NOW(), NOW()),
('Técnico', 'tecnico', 'Usuario técnico con acceso a aplicación móvil y instalaciones asignadas', 1, NOW(), NOW()),
('Soldador', 'soldador', 'Rol para personal de campo especializado en soldadura. Acceso principalmente a la aplicación móvil.', 1, NOW(), NOW()),
('Almacenista', 'almacenista', 'Puede gestionar entradas, salidas, asignaciones, devoluciones y traslados. Puede ver instalaciones y aprobar material.', 1, NOW(), NOW()),
('Bodega Internas', 'bodega-internas', 'Puede gestionar instalaciones, proyectos, usuarios y tipos de instalaciones. No puede asignar material. La información no se cruza con Bodega Redes.', 1, NOW(), NOW()),
('Bodega Redes', 'bodega-redes', 'Puede gestionar instalaciones, proyectos, usuarios y tipos de instalaciones. No puede asignar material. La información no se cruza con Bodega Internas.', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE `rolTipo` = VALUES(`rolTipo`), `rolDescripcion` = VALUES(`rolDescripcion`), `rolEstado` = 1, `fechaActualizacion` = NOW();

-- 2.2 TIPOS DE DOCUMENTO
INSERT INTO `tipos_documentos_identidad` (`tipoDocumentoCodigo`, `tipoDocumentoNombre`, `tipoDocumentoDescripcion`, `tipoDocumentoEstado`) VALUES
('CC', 'Cédula de Ciudadanía', 'Documento de identidad para ciudadanos colombianos mayores de edad', 1),
('CE', 'Cédula de Extranjería', 'Documento de identidad para extranjeros residentes en Colombia', 1),
('NUIP', 'Número Único de Identificación Personal', 'Número único de identificación personal', 1),
('SIC', 'SIC', 'Sistema de Identificación de Clientes', 1),
('CI', 'Certificado Instalador', 'Certificado de instalador para técnicos (alfanumérico)', 1),
('CS', 'Certificado Soldador', 'Certificado de soldador para personal especializado en soldadura (alfanumérico)', 1)
ON DUPLICATE KEY UPDATE `tipoDocumentoNombre` = VALUES(`tipoDocumentoNombre`), `tipoDocumentoDescripcion` = VALUES(`tipoDocumentoDescripcion`), `tipoDocumentoEstado` = 1;

-- 2.3 COLOMBIA (país, departamentos, municipios) - idempotente
INSERT INTO `paises` (`paisNombre`, `paisCodigo`, `paisEstado`, `fechaCreacion`, `fechaActualizacion`) VALUES
('Colombia', 'CO', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE `paisNombre` = `paisNombre`;

SET @pais_id = (SELECT `paisId` FROM `paises` WHERE `paisNombre` = 'Colombia' LIMIT 1);

INSERT INTO `departamentos` (`departamentoNombre`, `departamentoCodigo`, `paisId`, `departamentoEstado`, `fechaCreacion`, `fechaActualizacion`) VALUES
('Amazonas', '91', @pais_id, 1, NOW(), NOW()),
('Antioquia', '05', @pais_id, 1, NOW(), NOW()),
('Arauca', '81', @pais_id, 1, NOW(), NOW()),
('Atlántico', '08', @pais_id, 1, NOW(), NOW()),
('Bolívar', '13', @pais_id, 1, NOW(), NOW()),
('Boyacá', '15', @pais_id, 1, NOW(), NOW()),
('Caldas', '17', @pais_id, 1, NOW(), NOW()),
('Caquetá', '18', @pais_id, 1, NOW(), NOW()),
('Casanare', '85', @pais_id, 1, NOW(), NOW()),
('Cauca', '19', @pais_id, 1, NOW(), NOW()),
('Cesar', '20', @pais_id, 1, NOW(), NOW()),
('Chocó', '27', @pais_id, 1, NOW(), NOW()),
('Córdoba', '23', @pais_id, 1, NOW(), NOW()),
('Cundinamarca', '25', @pais_id, 1, NOW(), NOW()),
('Guainía', '94', @pais_id, 1, NOW(), NOW()),
('Guaviare', '95', @pais_id, 1, NOW(), NOW()),
('Huila', '41', @pais_id, 1, NOW(), NOW()),
('La Guajira', '44', @pais_id, 1, NOW(), NOW()),
('Magdalena', '47', @pais_id, 1, NOW(), NOW()),
('Meta', '50', @pais_id, 1, NOW(), NOW()),
('Nariño', '52', @pais_id, 1, NOW(), NOW()),
('Norte de Santander', '54', @pais_id, 1, NOW(), NOW()),
('Putumayo', '86', @pais_id, 1, NOW(), NOW()),
('Quindío', '63', @pais_id, 1, NOW(), NOW()),
('Risaralda', '66', @pais_id, 1, NOW(), NOW()),
('San Andrés y Providencia', '88', @pais_id, 1, NOW(), NOW()),
('Santander', '68', @pais_id, 1, NOW(), NOW()),
('Sucre', '70', @pais_id, 1, NOW(), NOW()),
('Tolima', '73', @pais_id, 1, NOW(), NOW()),
('Valle del Cauca', '76', @pais_id, 1, NOW(), NOW()),
('Vaupés', '97', @pais_id, 1, NOW(), NOW()),
('Vichada', '99', @pais_id, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE `departamentoNombre` = VALUES(`departamentoNombre`);

SET @santander_id = (SELECT `departamentoId` FROM `departamentos` WHERE `departamentoNombre` = 'Santander' LIMIT 1);
SET @norte_santander_id = (SELECT `departamentoId` FROM `departamentos` WHERE `departamentoNombre` = 'Norte de Santander' LIMIT 1);

INSERT INTO `municipios` (`municipioNombre`, `municipioCodigo`, `departamentoId`, `municipioEstado`, `fechaCreacion`, `fechaActualizacion`) VALUES
('Bucaramanga', '68001', @santander_id, 1, NOW(), NOW()),
('Cúcuta', '54001', @norte_santander_id, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE `municipioNombre` = VALUES(`municipioNombre`);

-- 2.4 ESTADOS (instalación, cliente, movimiento, traslado)
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

INSERT INTO `estados_cliente` (`estadoCodigo`, `estadoNombre`, `estadoDescripcion`) VALUES
('activo', 'Activo', 'Cliente activo sin instalaciones en proceso'),
('instalacion_asignada', 'Instalación Asignada', 'Cliente con instalación asignada'),
('realizando_instalacion', 'Realizando Instalación', 'Cliente con instalación en construcción o certificación')
ON DUPLICATE KEY UPDATE `estadoNombre` = VALUES(`estadoNombre`);

INSERT INTO `estados_movimiento` (`estadoCodigo`, `estadoNombre`, `estadoDescripcion`) VALUES
('pendiente', 'Pendiente', 'Movimiento pendiente'),
('completada', 'Completada', 'Movimiento completado'),
('cancelada', 'Cancelada', 'Movimiento cancelado')
ON DUPLICATE KEY UPDATE `estadoNombre` = VALUES(`estadoNombre`);

INSERT INTO `estados_traslado` (`estadoCodigo`, `estadoNombre`, `estadoDescripcion`) VALUES
('pendiente', 'Pendiente', 'Traslado pendiente'),
('en_transito', 'En Tránsito', 'Traslado en tránsito'),
('completado', 'Completado', 'Traslado completado'),
('cancelado', 'Cancelado', 'Traslado cancelado')
ON DUPLICATE KEY UPDATE `estadoNombre` = VALUES(`estadoNombre`);

-- 2.5 UNIDADES DE MEDIDA
INSERT INTO `unidades_medida` (`unidadMedidaNombre`, `unidadMedidaSimbolo`, `unidadMedidaEstado`, `fechaCreacion`, `fechaActualizacion`) VALUES
('Unidad', 'u', 1, NOW(), NOW()),
('Kilogramo', 'kg', 1, NOW(), NOW()),
('Gramo', 'g', 1, NOW(), NOW()),
('Litro', 'l', 1, NOW(), NOW()),
('Metro', 'm', 1, NOW(), NOW()),
('Caja', 'caja', 1, NOW(), NOW()),
('Paquete', 'paq', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE `unidadMedidaNombre` = `unidadMedidaNombre`;

-- 2.6 TIPOS DE INSTALACIÓN Y PROYECTO
INSERT IGNORE INTO `tipos_instalacion` (`tipoInstalacionNombre`, `usuarioRegistra`, `fechaCreacion`, `fechaActualizacion`) VALUES
('Instalación Nueva', 1, NOW(), NOW()),
('Reconexión', 1, NOW(), NOW()),
('Cambio de Medidor', 1, NOW(), NOW()),
('Reparación', 1, NOW(), NOW());

INSERT IGNORE INTO `tipos_proyecto` (`tipoProyectoNombre`, `tipoProyectoDescripcion`, `tipoProyectoEstado`, `fechaCreacion`, `fechaActualizacion`) VALUES
('Residencial', 'Proyectos para viviendas residenciales', 1, NOW(), NOW()),
('Comercial', 'Proyectos para establecimientos comerciales', 1, NOW(), NOW()),
('Industrial', 'Proyectos para instalaciones industriales', 1, NOW(), NOW());

-- 2.7 CATEGORÍAS
INSERT IGNORE INTO `categorias` (`categoriaNombre`, `categoriaDescripcion`, `categoriaCodigo`, `categoriaEstado`, `fechaCreacion`, `fechaActualizacion`) VALUES
('Medidores', 'Equipos de medición', 'CAT-001', 1, NOW(), NOW()),
('Accesorios', 'Accesorios de instalación', 'CAT-002', 1, NOW(), NOW()),
('Herramientas', 'Herramientas de trabajo', 'CAT-003', 1, NOW(), NOW());

INSERT IGNORE INTO `categorias` (`categoriaNombre`, `categoriaDescripcion`, `categoriaCodigo`, `categoriaPadreId`, `categoriaEstado`, `fechaCreacion`, `fechaActualizacion`)
SELECT 'Medidores de Agua', 'Medidores para agua potable', 'CAT-001-001', `categoriaId`, 1, NOW(), NOW() FROM `categorias` WHERE `categoriaCodigo` = 'CAT-001' LIMIT 1;
INSERT IGNORE INTO `categorias` (`categoriaNombre`, `categoriaDescripcion`, `categoriaCodigo`, `categoriaPadreId`, `categoriaEstado`, `fechaCreacion`, `fechaActualizacion`)
SELECT 'Medidores de Energía', 'Medidores eléctricos', 'CAT-001-002', `categoriaId`, 1, NOW(), NOW() FROM `categorias` WHERE `categoriaCodigo` = 'CAT-001' LIMIT 1;
INSERT IGNORE INTO `categorias` (`categoriaNombre`, `categoriaDescripcion`, `categoriaCodigo`, `categoriaPadreId`, `categoriaEstado`, `fechaCreacion`, `fechaActualizacion`)
SELECT 'Medidores de Gas', 'Medidores para gas natural', 'CAT-001-003', `categoriaId`, 1, NOW(), NOW() FROM `categorias` WHERE `categoriaCodigo` = 'CAT-001' LIMIT 1;

-- 2.8 USUARIO SUPERADMIN
-- El hash por defecto corresponde a la contraseña "password" (solo desarrollo).
-- Para usar Admin123 en producción ejecute: npm run seed
-- o genere: node -e "require('bcrypt').hash('Admin123',10).then(h=>console.log(h))" y actualice abajo.
INSERT INTO `usuarios` (
  `usuarioRolId`, `usuarioNombre`, `usuarioApellido`, `usuarioCorreo`, `usuarioDocumento`,
  `usuarioContrasena`, `usuarioEstado`, `fechaCreacion`, `fechaActualizacion`
) SELECT (SELECT `rolId` FROM `roles` WHERE `rolTipo` = 'superadmin' LIMIT 1), 'Super', 'Admin', 'admin@jarlepsis.com', '9999999999',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  1, NOW(), NOW()
  FROM DUAL
  WHERE EXISTS (SELECT 1 FROM `roles` WHERE `rolTipo` = 'superadmin' LIMIT 1)
ON DUPLICATE KEY UPDATE
  `usuarioRolId` = VALUES(`usuarioRolId`),
  `usuarioContrasena` = VALUES(`usuarioContrasena`),
  `usuarioEstado` = 1,
  `fechaActualizacion` = NOW();

-- ============================================
-- FIN FULL SEED
-- ============================================
-- Superadmin por defecto: correo admin@jarlepsis.com, contraseña "password".
-- Para Admin123 ejecute: npm run seed
