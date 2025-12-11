-- =====================================================
-- Migración completa actualizada para crear todas las tablas del sistema
-- Base de datos: jarlepsisdev
-- Fecha: 2025-01-XX
-- =====================================================

-- Desactivar verificación de foreign keys temporalmente
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- TABLAS BASE (sin dependencias)
-- =====================================================

-- Tabla: paises
CREATE TABLE IF NOT EXISTS `paises` (
  `paisId` int NOT NULL AUTO_INCREMENT,
  `paisNombre` varchar(255) NOT NULL,
  `paisCodigo` varchar(255) DEFAULT NULL,
  `paisEstado` tinyint NOT NULL DEFAULT 1,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`paisId`),
  UNIQUE KEY `IDX_a41210098923b3a0d106f35392` (`paisNombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: roles
CREATE TABLE IF NOT EXISTS `roles` (
  `rolId` int NOT NULL AUTO_INCREMENT,
  `rolNombre` varchar(255) NOT NULL,
  `rolTipo` enum('superadmin','admin','tecnico','empleado','bodega','inventario','traslados','devoluciones','salidas','entradas','instalaciones') NOT NULL,
  `rolDescripcion` text,
  `rolEstado` tinyint NOT NULL DEFAULT 1,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`rolId`),
  UNIQUE KEY `IDX_15922727e742377c8688c0eac8` (`rolNombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: tipos_documentos_identidad
CREATE TABLE IF NOT EXISTS `tipos_documentos_identidad` (
  `tipoDocumentoId` int NOT NULL AUTO_INCREMENT,
  `tipoDocumentoCodigo` varchar(255) NOT NULL,
  `tipoDocumentoNombre` varchar(255) NOT NULL,
  `tipoDocumentoDescripcion` text,
  `tipoDocumentoEstado` tinyint NOT NULL DEFAULT 1,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tipoDocumentoId`),
  UNIQUE KEY `IDX_tipo_documento_codigo` (`tipoDocumentoCodigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: unidades_medida
CREATE TABLE IF NOT EXISTS `unidades_medida` (
  `unidadMedidaId` int NOT NULL AUTO_INCREMENT,
  `unidadMedidaNombre` varchar(255) NOT NULL,
  `unidadMedidaSimbolo` varchar(255) DEFAULT NULL,
  `unidadMedidaEstado` tinyint NOT NULL DEFAULT 1,
  `usuarioRegistra` int DEFAULT NULL,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`unidadMedidaId`),
  UNIQUE KEY `IDX_unidad_medida_nombre` (`unidadMedidaNombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: estados_instalacion
CREATE TABLE IF NOT EXISTS `estados_instalacion` (
  `estadoInstalacionId` int NOT NULL AUTO_INCREMENT,
  `estadoCodigo` varchar(50) NOT NULL,
  `estadoNombre` varchar(100) NOT NULL,
  `estadoDescripcion` text,
  `activo` tinyint NOT NULL DEFAULT 1,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`estadoInstalacionId`),
  UNIQUE KEY `IDX_estado_instalacion_codigo` (`estadoCodigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: estados_cliente
CREATE TABLE IF NOT EXISTS `estados_cliente` (
  `estadoClienteId` int NOT NULL AUTO_INCREMENT,
  `estadoCodigo` varchar(50) NOT NULL,
  `estadoNombre` varchar(100) NOT NULL,
  `estadoDescripcion` text,
  `activo` tinyint NOT NULL DEFAULT 1,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`estadoClienteId`),
  UNIQUE KEY `IDX_estado_cliente_codigo` (`estadoCodigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: estados_movimiento
CREATE TABLE IF NOT EXISTS `estados_movimiento` (
  `estadoMovimientoId` int NOT NULL AUTO_INCREMENT,
  `estadoCodigo` varchar(50) NOT NULL,
  `estadoNombre` varchar(100) NOT NULL,
  `estadoDescripcion` text,
  `activo` tinyint NOT NULL DEFAULT 1,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`estadoMovimientoId`),
  UNIQUE KEY `IDX_estado_movimiento_codigo` (`estadoCodigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: estados_traslado
CREATE TABLE IF NOT EXISTS `estados_traslado` (
  `estadoTrasladoId` int NOT NULL AUTO_INCREMENT,
  `estadoCodigo` varchar(50) NOT NULL,
  `estadoNombre` varchar(100) NOT NULL,
  `estadoDescripcion` text,
  `activo` tinyint NOT NULL DEFAULT 1,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`estadoTrasladoId`),
  UNIQUE KEY `IDX_estado_traslado_codigo` (`estadoCodigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: proveedores
CREATE TABLE IF NOT EXISTS `proveedores` (
  `proveedorId` int NOT NULL AUTO_INCREMENT,
  `proveedorNombre` varchar(255) NOT NULL,
  `proveedorNit` varchar(255) DEFAULT NULL,
  `proveedorTelefono` varchar(255) DEFAULT NULL,
  `proveedorEmail` varchar(255) DEFAULT NULL,
  `proveedorDireccion` text,
  `proveedorContacto` varchar(255) DEFAULT NULL,
  `proveedorEstado` tinyint NOT NULL DEFAULT 1,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`proveedorId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: categorias
CREATE TABLE IF NOT EXISTS `categorias` (
  `categoriaId` int NOT NULL AUTO_INCREMENT,
  `categoriaNombre` varchar(255) NOT NULL,
  `categoriaDescripcion` text,
  `categoriaCodigo` varchar(255) DEFAULT NULL,
  `categoriaPadreId` int DEFAULT NULL,
  `categoriaEstado` tinyint NOT NULL DEFAULT 1,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`categoriaId`),
  KEY `FK_categoria_padre` (`categoriaPadreId`),
  CONSTRAINT `FK_256f7b54d0d61f76d19bcdd445b` FOREIGN KEY (`categoriaPadreId`) REFERENCES `categorias` (`categoriaId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: clasificaciones
CREATE TABLE IF NOT EXISTS `clasificaciones` (
  `clasificacionId` int NOT NULL AUTO_INCREMENT,
  `clasificacionNombre` varchar(255) NOT NULL,
  `clasificacionDescripcion` text,
  `clasificacionEstado` tinyint NOT NULL DEFAULT 1,
  `usuarioRegistra` int DEFAULT NULL,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`clasificacionId`),
  UNIQUE KEY `IDX_clasificacion_nombre` (`clasificacionNombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: tipos_proyecto
CREATE TABLE IF NOT EXISTS `tipos_proyecto` (
  `tipoProyectoId` int NOT NULL AUTO_INCREMENT,
  `tipoProyectoNombre` varchar(255) NOT NULL,
  `tipoProyectoDescripcion` text,
  `tipoProyectoEstado` tinyint NOT NULL DEFAULT 1,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tipoProyectoId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: tipos_instalacion
CREATE TABLE IF NOT EXISTS `tipos_instalacion` (
  `tipoInstalacionId` int NOT NULL AUTO_INCREMENT,
  `tipoInstalacionNombre` varchar(255) NOT NULL,
  `usuarioRegistra` int DEFAULT NULL,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tipoInstalacionId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLAS GEOGRÁFICAS (con dependencias)
-- =====================================================

-- Tabla: departamentos
CREATE TABLE IF NOT EXISTS `departamentos` (
  `departamentoId` int NOT NULL AUTO_INCREMENT,
  `departamentoNombre` varchar(255) NOT NULL,
  `departamentoCodigo` varchar(255) DEFAULT NULL,
  `departamentoEstado` tinyint NOT NULL DEFAULT 1,
  `paisId` int NOT NULL,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`departamentoId`),
  KEY `FK_d5965811c677912cf9b30c012a8` (`paisId`),
  CONSTRAINT `FK_d5965811c677912cf9b30c012a8` FOREIGN KEY (`paisId`) REFERENCES `paises` (`paisId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: municipios
CREATE TABLE IF NOT EXISTS `municipios` (
  `municipioId` int NOT NULL AUTO_INCREMENT,
  `municipioNombre` varchar(255) NOT NULL,
  `municipioCodigo` varchar(255) DEFAULT NULL,
  `municipioEstado` tinyint NOT NULL DEFAULT 1,
  `departamentoId` int NOT NULL,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`municipioId`),
  KEY `FK_d2a44d822f76137f2ad59ed4e14` (`departamentoId`),
  CONSTRAINT `FK_d2a44d822f76137f2ad59ed4e14` FOREIGN KEY (`departamentoId`) REFERENCES `departamentos` (`departamentoId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: sedes
CREATE TABLE IF NOT EXISTS `sedes` (
  `sedeId` int NOT NULL AUTO_INCREMENT,
  `sedeNombre` varchar(255) NOT NULL,
  `departamentoId` int NOT NULL,
  `sedeDireccion` text,
  `sedeTelefono` varchar(255) DEFAULT NULL,
  `sedeCorreo` varchar(255) DEFAULT NULL,
  `sedeFoto` longtext,
  `sedeEstado` tinyint NOT NULL DEFAULT 1,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`sedeId`),
  KEY `FK_a29f68131e1e64b83eb47f61a9c` (`departamentoId`),
  CONSTRAINT `FK_a29f68131e1e64b83eb47f61a9c` FOREIGN KEY (`departamentoId`) REFERENCES `departamentos` (`departamentoId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: oficinas (mantenida por compatibilidad, pero las bodegas ahora pertenecen a sedes)
CREATE TABLE IF NOT EXISTS `oficinas` (
  `oficinaId` int NOT NULL AUTO_INCREMENT,
  `oficinaNombre` varchar(255) NOT NULL,
  `municipioId` int NOT NULL,
  `oficinaDireccion` text,
  `oficinaTelefono` varchar(255) DEFAULT NULL,
  `oficinaCorreo` varchar(255) DEFAULT NULL,
  `oficinaFoto` longtext,
  `oficinaEstado` tinyint NOT NULL DEFAULT 1,
  `sedeId` int DEFAULT NULL,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`oficinaId`),
  KEY `FK_2b905fece0e231244e482ef90ef` (`municipioId`),
  KEY `FK_00f0183748f6222aba567d51007` (`sedeId`),
  CONSTRAINT `FK_2b905fece0e231244e482ef90ef` FOREIGN KEY (`municipioId`) REFERENCES `municipios` (`municipioId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_00f0183748f6222aba567d51007` FOREIGN KEY (`sedeId`) REFERENCES `sedes` (`sedeId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: bodegas (ahora pertenecen directamente a sedes)
CREATE TABLE IF NOT EXISTS `bodegas` (
  `bodegaId` int NOT NULL AUTO_INCREMENT,
  `bodegaNombre` varchar(255) NOT NULL,
  `bodegaDescripcion` text,
  `bodegaUbicacion` varchar(255) DEFAULT NULL,
  `bodegaTelefono` varchar(255) DEFAULT NULL,
  `bodegaCorreo` varchar(255) DEFAULT NULL,
  `bodegaFoto` longtext,
  `bodegaEstado` tinyint NOT NULL DEFAULT 1,
  `sedeId` int NOT NULL,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`bodegaId`),
  KEY `FK_bodega_sede` (`sedeId`),
  CONSTRAINT `FK_bodega_sede` FOREIGN KEY (`sedeId`) REFERENCES `sedes` (`sedeId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLAS DE USUARIOS
-- =====================================================

-- Tabla: usuarios
CREATE TABLE IF NOT EXISTS `usuarios` (
  `usuarioId` int NOT NULL AUTO_INCREMENT,
  `usuarioRolId` int NOT NULL,
  `usuarioSede` int DEFAULT NULL,
  `usuarioBodega` int DEFAULT NULL,
  `usuarioOficina` int DEFAULT NULL,
  `usuarioNombre` varchar(255) NOT NULL,
  `usuarioApellido` varchar(255) NOT NULL,
  `usuarioCorreo` varchar(255) NOT NULL,
  `usuarioTelefono` varchar(255) DEFAULT NULL,
  `tipoDocumentoId` int DEFAULT NULL,
  `usuarioDocumento` varchar(255) NOT NULL,
  `usuarioContrasena` varchar(255) NOT NULL,
  `usuarioCreador` int DEFAULT NULL,
  `usuarioFoto` longtext,
  `usuarioEstado` tinyint NOT NULL DEFAULT 1,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`usuarioId`),
  UNIQUE KEY `IDX_3d090cdeca516ff8862c759d27` (`usuarioCorreo`),
  UNIQUE KEY `IDX_36aa532a927ba2af16a4129f76` (`usuarioDocumento`),
  KEY `FK_52df7eb55c68bbf86ffcbb2a4d3` (`usuarioRolId`),
  KEY `FK_5c23fae8dc660d2711fd2d74f4e` (`usuarioSede`),
  KEY `FK_465482a862dbdd1c7f5deba35b4` (`usuarioBodega`),
  KEY `FK_1436739801d0240d740d7ec03a8` (`usuarioOficina`),
  KEY `FK_tipo_documento_usuario` (`tipoDocumentoId`),
  CONSTRAINT `FK_52df7eb55c68bbf86ffcbb2a4d3` FOREIGN KEY (`usuarioRolId`) REFERENCES `roles` (`rolId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_5c23fae8dc660d2711fd2d74f4e` FOREIGN KEY (`usuarioSede`) REFERENCES `sedes` (`sedeId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_465482a862dbdd1c7f5deba35b4` FOREIGN KEY (`usuarioBodega`) REFERENCES `bodegas` (`bodegaId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_1436739801d0240d740d7ec03a8` FOREIGN KEY (`usuarioOficina`) REFERENCES `oficinas` (`oficinaId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_tipo_documento_usuario` FOREIGN KEY (`tipoDocumentoId`) REFERENCES `tipos_documentos_identidad` (`tipoDocumentoId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: estados_usuario
CREATE TABLE IF NOT EXISTS `estados_usuario` (
  `estadoUsuarioId` int NOT NULL AUTO_INCREMENT,
  `usuarioId` int NOT NULL,
  `estado` enum('desconectado','en_linea','ocupado') NOT NULL DEFAULT 'desconectado',
  `mensajeEstado` text,
  `ultimaConexion` datetime DEFAULT NULL,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`estadoUsuarioId`),
  UNIQUE KEY `IDX_4ca4e684bd67c06bfb6742a6db` (`usuarioId`),
  CONSTRAINT `FK_4ca4e684bd67c06bfb6742a6dbe` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios` (`usuarioId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLAS DE INVENTARIO Y MATERIALES
-- =====================================================

-- Tabla: inventarios
CREATE TABLE IF NOT EXISTS `inventarios` (
  `inventarioId` int NOT NULL AUTO_INCREMENT,
  `inventarioNombre` varchar(255) NOT NULL,
  `inventarioDescripcion` text,
  `bodegaId` int NOT NULL,
  `inventarioEstado` tinyint NOT NULL DEFAULT 1,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`inventarioId`),
  KEY `FK_6b21221c35a226aa96e284a0dfa` (`bodegaId`),
  CONSTRAINT `FK_6b21221c35a226aa96e284a0dfa` FOREIGN KEY (`bodegaId`) REFERENCES `bodegas` (`bodegaId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: materiales
CREATE TABLE IF NOT EXISTS `materiales` (
  `materialId` int NOT NULL AUTO_INCREMENT,
  `categoriaId` int NOT NULL,
  `proveedorId` int NOT NULL,
  `inventarioId` int DEFAULT NULL,
  `unidadMedidaId` int DEFAULT NULL,
  `materialCodigo` varchar(255) NOT NULL,
  `materialNombre` varchar(255) NOT NULL,
  `materialDescripcion` text,
  `materialStock` decimal(10,2) NOT NULL DEFAULT '0.00',
  `materialPrecio` decimal(10,2) NOT NULL,
  `materialMarca` varchar(255) DEFAULT NULL,
  `materialModelo` varchar(255) DEFAULT NULL,
  `materialSerial` varchar(255) DEFAULT NULL,
  `materialFoto` longtext,
  `usuarioRegistra` int DEFAULT NULL,
  `materialEstado` tinyint NOT NULL DEFAULT 1,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`materialId`),
  KEY `FK_7012970c3aa654bf7089841c7e1` (`categoriaId`),
  KEY `FK_e18bfec6e2c60d47591fd62db1b` (`proveedorId`),
  KEY `FK_70b2f1e5be350d561a08db3162f` (`inventarioId`),
  KEY `FK_unidad_medida_material` (`unidadMedidaId`),
  CONSTRAINT `FK_7012970c3aa654bf7089841c7e1` FOREIGN KEY (`categoriaId`) REFERENCES `categorias` (`categoriaId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_e18bfec6e2c60d47591fd62db1b` FOREIGN KEY (`proveedorId`) REFERENCES `proveedores` (`proveedorId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_70b2f1e5be350d561a08db3162f` FOREIGN KEY (`inventarioId`) REFERENCES `inventarios` (`inventarioId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_unidad_medida_material` FOREIGN KEY (`unidadMedidaId`) REFERENCES `unidades_medida` (`unidadMedidaId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: materiales_bodegas
CREATE TABLE IF NOT EXISTS `materiales_bodegas` (
  `materialBodegaId` int NOT NULL AUTO_INCREMENT,
  `materialId` int NOT NULL,
  `bodegaId` int NOT NULL,
  `stock` decimal(10,2) NOT NULL DEFAULT '0.00',
  `precioPromedio` decimal(10,2) DEFAULT NULL,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`materialBodegaId`),
  UNIQUE KEY `IDX_material_bodega_unique` (`materialId`,`bodegaId`),
  KEY `FK_material_bodega_material` (`materialId`),
  KEY `FK_material_bodega_bodega` (`bodegaId`),
  CONSTRAINT `FK_material_bodega_material` FOREIGN KEY (`materialId`) REFERENCES `materiales` (`materialId`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `FK_material_bodega_bodega` FOREIGN KEY (`bodegaId`) REFERENCES `bodegas` (`bodegaId`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: inventario_tecnicos
CREATE TABLE IF NOT EXISTS `inventario_tecnicos` (
  `inventarioTecnicoId` int NOT NULL AUTO_INCREMENT,
  `usuarioId` int NOT NULL,
  `materialId` int NOT NULL,
  `cantidad` decimal(10,2) NOT NULL DEFAULT '0.00',
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`inventarioTecnicoId`),
  KEY `FK_inventario_tecnico_usuario` (`usuarioId`),
  KEY `FK_inventario_tecnico_material` (`materialId`),
  CONSTRAINT `FK_inventario_tecnico_usuario` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios` (`usuarioId`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `FK_inventario_tecnico_material` FOREIGN KEY (`materialId`) REFERENCES `materiales` (`materialId`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLAS DE CLIENTES E INSTALACIONES
-- =====================================================

-- Tabla: clientes
CREATE TABLE IF NOT EXISTS `clientes` (
  `clienteId` int NOT NULL AUTO_INCREMENT,
  `nombreUsuario` varchar(255) NOT NULL,
  `clienteTelefono` varchar(255) DEFAULT NULL,
  `clienteDireccion` text NOT NULL,
  `clienteBarrio` varchar(255) DEFAULT NULL,
  `municipioId` int DEFAULT NULL,
  `cantidadInstalaciones` int NOT NULL DEFAULT '0',
  `clienteEstado` enum('activo','instalacion_asignada','realizando_instalacion') NOT NULL DEFAULT 'activo',
  `estadoClienteId` int DEFAULT NULL,
  `usuarioRegistra` int DEFAULT NULL,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`clienteId`),
  KEY `FK_cliente_municipio` (`municipioId`),
  KEY `FK_cliente_estado` (`estadoClienteId`),
  CONSTRAINT `FK_cliente_municipio` FOREIGN KEY (`municipioId`) REFERENCES `municipios` (`municipioId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_cliente_estado` FOREIGN KEY (`estadoClienteId`) REFERENCES `estados_cliente` (`estadoClienteId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: instalaciones
CREATE TABLE IF NOT EXISTS `instalaciones` (
  `instalacionId` int NOT NULL AUTO_INCREMENT,
  `identificadorUnico` varchar(255) DEFAULT NULL,
  `instalacionCodigo` varchar(255) NOT NULL,
  `tipoInstalacionId` int NOT NULL,
  `clienteId` int NOT NULL,
  `clasificacionId` int DEFAULT NULL,
  `instalacionMedidorNumero` varchar(255) DEFAULT NULL,
  `instalacionSelloNumero` varchar(255) DEFAULT NULL,
  `instalacionSelloRegulador` varchar(255) DEFAULT NULL,
  `instalacionFecha` date DEFAULT NULL,
  `fechaAsignacion` datetime DEFAULT NULL,
  `fechaConstruccion` datetime DEFAULT NULL,
  `fechaCertificacion` datetime DEFAULT NULL,
  `fechaAnulacion` datetime DEFAULT NULL,
  `fechaNovedad` datetime DEFAULT NULL,
  `fechaFinalizacion` datetime DEFAULT NULL,
  `materialesInstalados` json DEFAULT NULL,
  `instalacionProyectos` json DEFAULT NULL,
  `instalacionObservaciones` text,
  `observacionesTecnico` text,
  `estado` enum('pendiente','en_proceso','completada','finalizada','cancelada','asignacion','construccion','certificacion','novedad','anulada') NOT NULL DEFAULT 'pendiente',
  `estadoInstalacionId` int DEFAULT NULL,
  `usuarioRegistra` int NOT NULL,
  `bodegaId` int DEFAULT NULL,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`instalacionId`),
  UNIQUE KEY `IDX_instalacion_identificador_unico` (`identificadorUnico`),
  KEY `FK_47c1485c67d5815dccc10ceb2f0` (`tipoInstalacionId`),
  KEY `FK_4d32ba756d353653458e406c496` (`clienteId`),
  KEY `FK_instalacion_clasificacion` (`clasificacionId`),
  KEY `FK_instalacion_estado` (`estadoInstalacionId`),
  KEY `FK_instalacion_bodega` (`bodegaId`),
  CONSTRAINT `FK_47c1485c67d5815dccc10ceb2f0` FOREIGN KEY (`tipoInstalacionId`) REFERENCES `tipos_instalacion` (`tipoInstalacionId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_4d32ba756d353653458e406c496` FOREIGN KEY (`clienteId`) REFERENCES `clientes` (`clienteId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_instalacion_clasificacion` FOREIGN KEY (`clasificacionId`) REFERENCES `clasificaciones` (`clasificacionId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_instalacion_estado` FOREIGN KEY (`estadoInstalacionId`) REFERENCES `estados_instalacion` (`estadoInstalacionId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_instalacion_bodega` FOREIGN KEY (`bodegaId`) REFERENCES `bodegas` (`bodegaId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: instalaciones_usuarios
CREATE TABLE IF NOT EXISTS `instalaciones_usuarios` (
  `instalacionUsuarioId` int NOT NULL AUTO_INCREMENT,
  `instalacionId` int NOT NULL,
  `usuarioId` int NOT NULL,
  `rolEnInstalacion` varchar(255) DEFAULT NULL,
  `observaciones` text,
  `activo` tinyint NOT NULL DEFAULT 1,
  `fechaAsignacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`instalacionUsuarioId`),
  KEY `FK_5a29cf21d777335d79342d30cea` (`instalacionId`),
  KEY `FK_2ee55201259841cc3357c49531c` (`usuarioId`),
  CONSTRAINT `FK_5a29cf21d777335d79342d30cea` FOREIGN KEY (`instalacionId`) REFERENCES `instalaciones` (`instalacionId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_2ee55201259841cc3357c49531c` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios` (`usuarioId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: instalaciones_materiales
CREATE TABLE IF NOT EXISTS `instalaciones_materiales` (
  `instalacionMaterialId` int NOT NULL AUTO_INCREMENT,
  `instalacionId` int NOT NULL,
  `materialId` int NOT NULL,
  `cantidad` decimal(10,2) NOT NULL,
  `observaciones` text,
  `materialAprobado` tinyint DEFAULT NULL,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`instalacionMaterialId`),
  KEY `FK_instalacion_material_instalacion` (`instalacionId`),
  KEY `FK_instalacion_material_material` (`materialId`),
  CONSTRAINT `FK_instalacion_material_instalacion` FOREIGN KEY (`instalacionId`) REFERENCES `instalaciones` (`instalacionId`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `FK_instalacion_material_material` FOREIGN KEY (`materialId`) REFERENCES `materiales` (`materialId`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLAS DE PROYECTOS
-- =====================================================

-- Tabla: proyectos (ACTUALIZADA - ya NO tiene tipoProyectoId)
CREATE TABLE IF NOT EXISTS `proyectos` (
  `proyectoId` int NOT NULL AUTO_INCREMENT,
  `proyectoNombre` varchar(255) NOT NULL,
  `proyectoDescripcion` text,
  `proyectoCodigo` varchar(255) DEFAULT NULL,
  `usuarioRegistra` int DEFAULT NULL,
  `proyectoEstado` tinyint NOT NULL DEFAULT 1,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`proyectoId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: items_proyecto (ACTUALIZADA - ya NO tiene materialId ni itemCantidad)
CREATE TABLE IF NOT EXISTS `items_proyecto` (
  `itemProyectoId` int NOT NULL AUTO_INCREMENT,
  `proyectoId` int NOT NULL,
  `itemNombre` varchar(255) NOT NULL,
  `itemCodigo` varchar(255) DEFAULT NULL,
  `itemDescripcion` text,
  `usuarioRegistra` int DEFAULT NULL,
  `itemEstado` tinyint NOT NULL DEFAULT 1,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`itemProyectoId`),
  KEY `FK_10b2ebe48e25edd38576088acbb` (`proyectoId`),
  CONSTRAINT `FK_10b2ebe48e25edd38576088acbb` FOREIGN KEY (`proyectoId`) REFERENCES `proyectos` (`proyectoId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLAS DE MOVIMIENTOS Y TRASLADOS
-- =====================================================

-- Tabla: movimientos_inventario
CREATE TABLE IF NOT EXISTS `movimientos_inventario` (
  `movimientoId` int NOT NULL AUTO_INCREMENT,
  `materialId` int NOT NULL,
  `movimientoTipo` enum('entrada','salida','devolucion') NOT NULL,
  `movimientoCantidad` decimal(10,2) NOT NULL,
  `movimientoPrecioUnitario` decimal(10,2) DEFAULT NULL,
  `movimientoObservaciones` text,
  `instalacionId` int DEFAULT NULL,
  `usuarioId` int NOT NULL,
  `proveedorId` int DEFAULT NULL,
  `inventarioId` int DEFAULT NULL,
  `movimientoCodigo` varchar(255) DEFAULT NULL,
  `identificadorUnico` varchar(255) DEFAULT NULL,
  `movimientoEstado` enum('pendiente','completada','cancelada') NOT NULL DEFAULT 'completada',
  `estadoMovimientoId` int DEFAULT NULL,
  `tecnicoOrigenId` int DEFAULT NULL,
  `origenTipo` enum('bodega','tecnico') DEFAULT NULL,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`movimientoId`),
  UNIQUE KEY `IDX_movimiento_identificador_unico` (`identificadorUnico`),
  KEY `FK_c9f92ec677067abab7e57dfe881` (`instalacionId`),
  KEY `FK_cb6886f6f3ab00b6f2abb362d2f` (`usuarioId`),
  KEY `FK_2bb1b847524ee608623272c6d3a` (`proveedorId`),
  KEY `FK_movimiento_inventario` (`inventarioId`),
  KEY `FK_movimiento_estado` (`estadoMovimientoId`),
  KEY `FK_movimiento_tecnico_origen` (`tecnicoOrigenId`),
  CONSTRAINT `FK_c9f92ec677067abab7e57dfe881` FOREIGN KEY (`instalacionId`) REFERENCES `instalaciones` (`instalacionId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_cb6886f6f3ab00b6f2abb362d2f` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios` (`usuarioId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_2bb1b847524ee608623272c6d3a` FOREIGN KEY (`proveedorId`) REFERENCES `proveedores` (`proveedorId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_movimiento_inventario` FOREIGN KEY (`inventarioId`) REFERENCES `inventarios` (`inventarioId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_movimiento_estado` FOREIGN KEY (`estadoMovimientoId`) REFERENCES `estados_movimiento` (`estadoMovimientoId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_movimiento_tecnico_origen` FOREIGN KEY (`tecnicoOrigenId`) REFERENCES `usuarios` (`usuarioId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: traslados
CREATE TABLE IF NOT EXISTS `traslados` (
  `trasladoId` int NOT NULL AUTO_INCREMENT,
  `materialId` int NOT NULL,
  `bodegaOrigenId` int NOT NULL,
  `bodegaDestinoId` int NOT NULL,
  `trasladoCantidad` decimal(10,2) NOT NULL,
  `trasladoEstado` enum('pendiente','en_transito','completado','cancelado') NOT NULL DEFAULT 'pendiente',
  `estadoTrasladoId` int DEFAULT NULL,
  `trasladoObservaciones` text,
  `trasladoCodigo` varchar(255) DEFAULT NULL,
  `identificadorUnico` varchar(255) DEFAULT NULL,
  `usuarioId` int NOT NULL,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`trasladoId`),
  UNIQUE KEY `IDX_traslado_identificador_unico` (`identificadorUnico`),
  KEY `FK_01892687c6a32a6f06e19f2785a` (`materialId`),
  KEY `FK_07994d68d25f24d9ff11f2f7012` (`bodegaOrigenId`),
  KEY `FK_7a90ecff82a88635ff8ee0b8925` (`bodegaDestinoId`),
  KEY `FK_6b73b2406e43cf61e42a5cc1699` (`usuarioId`),
  KEY `FK_traslado_estado` (`estadoTrasladoId`),
  CONSTRAINT `FK_01892687c6a32a6f06e19f2785a` FOREIGN KEY (`materialId`) REFERENCES `materiales` (`materialId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_07994d68d25f24d9ff11f2f7012` FOREIGN KEY (`bodegaOrigenId`) REFERENCES `bodegas` (`bodegaId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_7a90ecff82a88635ff8ee0b8925` FOREIGN KEY (`bodegaDestinoId`) REFERENCES `bodegas` (`bodegaId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_6b73b2406e43cf61e42a5cc1699` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios` (`usuarioId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_traslado_estado` FOREIGN KEY (`estadoTrasladoId`) REFERENCES `estados_traslado` (`estadoTrasladoId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: asignaciones_tecnicos
CREATE TABLE IF NOT EXISTS `asignaciones_tecnicos` (
  `asignacionTecnicoId` int NOT NULL AUTO_INCREMENT,
  `asignacionCodigo` varchar(255) NOT NULL,
  `usuarioId` int NOT NULL,
  `inventarioId` int NOT NULL,
  `usuarioAsignadorId` int NOT NULL,
  `materiales` json NOT NULL,
  `observaciones` text,
  `asignacionEstado` enum('pendiente','aprobada','rechazada') NOT NULL DEFAULT 'pendiente',
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`asignacionTecnicoId`),
  UNIQUE KEY `IDX_asignacion_codigo` (`asignacionCodigo`),
  KEY `FK_asignacion_tecnico_usuario` (`usuarioId`),
  KEY `FK_asignacion_tecnico_inventario` (`inventarioId`),
  KEY `FK_asignacion_tecnico_asignador` (`usuarioAsignadorId`),
  CONSTRAINT `FK_asignacion_tecnico_usuario` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios` (`usuarioId`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `FK_asignacion_tecnico_inventario` FOREIGN KEY (`inventarioId`) REFERENCES `inventarios` (`inventarioId`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `FK_asignacion_tecnico_asignador` FOREIGN KEY (`usuarioAsignadorId`) REFERENCES `usuarios` (`usuarioId`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLAS DE CHAT Y NOTIFICACIONES
-- =====================================================

-- Tabla: grupos (ACTUALIZADA - ahora incluye 'sede' y 'directo' en tipoGrupo)
CREATE TABLE IF NOT EXISTS `grupos` (
  `grupoId` int NOT NULL AUTO_INCREMENT,
  `grupoNombre` varchar(255) NOT NULL,
  `grupoDescripcion` text,
  `tipoGrupo` enum('general','sede','oficina','bodega','instalacion','directo') NOT NULL DEFAULT 'general',
  `entidadId` int DEFAULT NULL,
  `grupoActivo` tinyint NOT NULL DEFAULT 1,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`grupoId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: usuarios_grupos
CREATE TABLE IF NOT EXISTS `usuarios_grupos` (
  `usuarioGrupoId` int NOT NULL AUTO_INCREMENT,
  `grupoId` int NOT NULL,
  `usuarioId` int NOT NULL,
  `activo` tinyint NOT NULL DEFAULT 1,
  `ultimaLectura` datetime DEFAULT NULL,
  `fechaIngreso` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`usuarioGrupoId`),
  KEY `FK_19346f34021c43ddcb4b71ca01b` (`grupoId`),
  KEY `FK_61a07e5dbd1ff5229b79ce78b44` (`usuarioId`),
  CONSTRAINT `FK_19346f34021c43ddcb4b71ca01b` FOREIGN KEY (`grupoId`) REFERENCES `grupos` (`grupoId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_61a07e5dbd1ff5229b79ce78b44` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios` (`usuarioId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: mensajes
CREATE TABLE IF NOT EXISTS `mensajes` (
  `mensajeId` int NOT NULL AUTO_INCREMENT,
  `grupoId` int NOT NULL,
  `usuarioId` int NOT NULL,
  `mensajeTexto` text NOT NULL,
  `mensajeRespuestaId` int DEFAULT NULL,
  `archivosAdjuntos` json DEFAULT NULL,
  `mensajeEditado` tinyint NOT NULL DEFAULT 0,
  `mensajeActivo` tinyint NOT NULL DEFAULT 1,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`mensajeId`),
  KEY `FK_8ea1dc1770a82d6d817c0c3688f` (`grupoId`),
  KEY `FK_d8eb81491fa2290c318a9e3e64c` (`usuarioId`),
  KEY `FK_b9d2ab76b3675eb25429e7c68ac` (`mensajeRespuestaId`),
  CONSTRAINT `FK_8ea1dc1770a82d6d817c0c3688f` FOREIGN KEY (`grupoId`) REFERENCES `grupos` (`grupoId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_d8eb81491fa2290c318a9e3e64c` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios` (`usuarioId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_b9d2ab76b3675eb25429e7c68ac` FOREIGN KEY (`mensajeRespuestaId`) REFERENCES `mensajes` (`mensajeId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: reacciones_mensaje
CREATE TABLE IF NOT EXISTS `reacciones_mensaje` (
  `reaccionMensajeId` int NOT NULL AUTO_INCREMENT,
  `mensajeId` int NOT NULL,
  `usuarioId` int NOT NULL,
  `tipoReaccion` varchar(255) NOT NULL,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`reaccionMensajeId`),
  UNIQUE KEY `IDX_638497cb6108396310e63eb241` (`mensajeId`,`usuarioId`),
  KEY `FK_17f9e1a02a87a20990b068c62ba` (`mensajeId`),
  KEY `FK_4c8fdd44cb5646add3f24b20a96` (`usuarioId`),
  CONSTRAINT `FK_17f9e1a02a87a20990b068c62ba` FOREIGN KEY (`mensajeId`) REFERENCES `mensajes` (`mensajeId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_4c8fdd44cb5646add3f24b20a96` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios` (`usuarioId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: notificaciones (ACTUALIZADA - más tipos de notificación)
CREATE TABLE IF NOT EXISTS `notificaciones` (
  `notificacionId` int NOT NULL AUTO_INCREMENT,
  `usuarioId` int NOT NULL,
  `tipoNotificacion` enum('mensaje_nuevo','reaccion_mensaje','instalacion_completada','instalacion_asignada','instalacion_en_proceso','instalacion_cancelada','instalacion_asignacion','instalacion_construccion','instalacion_certificacion','instalacion_novedad','instalacion_anulada','mensaje_respondido','usuario_ingreso_grupo','usuario_salio_grupo') NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `contenido` text NOT NULL,
  `datosAdicionales` json DEFAULT NULL,
  `grupoId` int DEFAULT NULL,
  `instalacionId` int DEFAULT NULL,
  `mensajeId` int DEFAULT NULL,
  `leida` tinyint NOT NULL DEFAULT 0,
  `fechaLectura` datetime DEFAULT NULL,
  `fechaCreacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`notificacionId`),
  KEY `IDX_81759d00842f38b504bd238a2d` (`usuarioId`,`fechaCreacion`),
  KEY `IDX_b8916de45f1822fa3cad6d6f37` (`usuarioId`,`leida`),
  KEY `FK_125b6cc2388b61c1b00c633c673` (`usuarioId`),
  CONSTRAINT `FK_125b6cc2388b61c1b00c633c673` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios` (`usuarioId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA DE AUDITORÍA
-- =====================================================

-- Tabla: auditoria_eliminaciones
CREATE TABLE IF NOT EXISTS `auditoria_eliminaciones` (
  `auditoriaId` int NOT NULL AUTO_INCREMENT,
  `tipoEntidad` enum('movimiento','instalacion','traslado') NOT NULL,
  `entidadId` int NOT NULL,
  `datosEliminados` json DEFAULT NULL,
  `motivo` text,
  `usuarioId` int NOT NULL,
  `observaciones` text,
  `fechaEliminacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`auditoriaId`),
  KEY `FK_auditoria_usuario` (`usuarioId`),
  CONSTRAINT `FK_auditoria_usuario` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios` (`usuarioId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reactivar verificación de foreign keys
SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- FIN DE LA MIGRACIÓN ACTUALIZADA
-- =====================================================
