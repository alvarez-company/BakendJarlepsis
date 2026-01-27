-- Migración para crear la tabla tipos_documentos_identidad y agregar la columna tipoDocumentoId
-- Esta tabla contiene los tipos de documentos de identidad válidos en Colombia

-- Crear tabla tipos_documentos_identidad
CREATE TABLE IF NOT EXISTS `tipos_documentos_identidad` (
  `tipoDocumentoId` INT NOT NULL AUTO_INCREMENT,
  `tipoDocumentoCodigo` VARCHAR(10) NOT NULL,
  `tipoDocumentoNombre` VARCHAR(100) NOT NULL,
  `tipoDocumentoDescripcion` TEXT NULL,
  `tipoDocumentoEstado` TINYINT(1) NOT NULL DEFAULT 1,
  `fechaCreacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fechaActualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`tipoDocumentoId`),
  UNIQUE INDEX `IDX_tipoDocumentoCodigo` (`tipoDocumentoCodigo`),
  INDEX `IDX_tipoDocumentoEstado` (`tipoDocumentoEstado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar tipos de documentos de identidad
INSERT IGNORE INTO `tipos_documentos_identidad` 
  (`tipoDocumentoCodigo`, `tipoDocumentoNombre`, `tipoDocumentoDescripcion`, `tipoDocumentoEstado`) 
VALUES
  ('CC', 'Cédula de Ciudadanía', 'Documento de identidad para ciudadanos colombianos mayores de edad', 1),
  ('CE', 'Cédula de Extranjería', 'Documento de identidad para extranjeros residentes en Colombia', 1),
  ('NUIP', 'Número Único de Identificación Personal', 'Número único de identificación personal', 1),
  ('SIC', 'SIC', 'Sistema de Identificación de Clientes', 1),
  ('CI', 'Certificado Instalador', 'Certificado de instalador para técnicos (alfanumérico)', 1),
  ('CS', 'Certificado Soldador', 'Certificado de soldador para personal especializado en soldadura (alfanumérico)', 1);

-- Agregar columna tipoDocumentoId a la tabla usuarios
SET @col_exists_usuarios = (SELECT COUNT(*) 
                            FROM information_schema.COLUMNS 
                            WHERE TABLE_SCHEMA = DATABASE()
                            AND TABLE_NAME = 'usuarios' 
                            AND COLUMN_NAME = 'tipoDocumentoId');

SET @sql_add_col_usuarios = IF(@col_exists_usuarios = 0,
    'ALTER TABLE `usuarios` ADD COLUMN `tipoDocumentoId` INT NULL AFTER `usuarioTelefono`',
    'SELECT "La columna tipoDocumentoId ya existe en la tabla usuarios" AS message');

PREPARE stmt_usuarios FROM @sql_add_col_usuarios;
EXECUTE stmt_usuarios;
DEALLOCATE PREPARE stmt_usuarios;

-- Agregar foreign key para usuarios
SET @fk_exists_usuarios = (SELECT COUNT(*) 
                           FROM information_schema.TABLE_CONSTRAINTS 
                           WHERE TABLE_SCHEMA = DATABASE()
                           AND TABLE_NAME = 'usuarios' 
                           AND CONSTRAINT_NAME = 'FK_usuarios_tipoDocumentoId'
                           AND CONSTRAINT_TYPE = 'FOREIGN KEY');

SET @sql_add_fk_usuarios = IF(@fk_exists_usuarios = 0 AND @col_exists_usuarios = 0,
    'ALTER TABLE `usuarios` 
     ADD CONSTRAINT `FK_usuarios_tipoDocumentoId` 
     FOREIGN KEY (`tipoDocumentoId`) 
     REFERENCES `tipos_documentos_identidad` (`tipoDocumentoId`) 
     ON DELETE SET NULL 
     ON UPDATE CASCADE',
    'SELECT "La foreign key ya existe o la columna no se pudo agregar" AS message');

PREPARE stmt_fk_usuarios FROM @sql_add_fk_usuarios;
EXECUTE stmt_fk_usuarios;
DEALLOCATE PREPARE stmt_fk_usuarios;

-- Agregar columna tipoDocumentoId a la tabla clientes
SET @col_exists_clientes = (SELECT COUNT(*) 
                            FROM information_schema.COLUMNS 
                            WHERE TABLE_SCHEMA = DATABASE()
                            AND TABLE_NAME = 'clientes' 
                            AND COLUMN_NAME = 'tipoDocumentoId');

SET @sql_add_col_clientes = IF(@col_exists_clientes = 0,
    'ALTER TABLE `clientes` ADD COLUMN `tipoDocumentoId` INT NULL AFTER `clienteCorreo`',
    'SELECT "La columna tipoDocumentoId ya existe en la tabla clientes" AS message');

PREPARE stmt_clientes FROM @sql_add_col_clientes;
EXECUTE stmt_clientes;
DEALLOCATE PREPARE stmt_clientes;

-- Agregar foreign key para clientes
SET @fk_exists_clientes = (SELECT COUNT(*) 
                           FROM information_schema.TABLE_CONSTRAINTS 
                           WHERE TABLE_SCHEMA = DATABASE()
                           AND TABLE_NAME = 'clientes' 
                           AND CONSTRAINT_NAME = 'FK_clientes_tipoDocumentoId'
                           AND CONSTRAINT_TYPE = 'FOREIGN KEY');

SET @sql_add_fk_clientes = IF(@fk_exists_clientes = 0 AND @col_exists_clientes = 0,
    'ALTER TABLE `clientes` 
     ADD CONSTRAINT `FK_clientes_tipoDocumentoId` 
     FOREIGN KEY (`tipoDocumentoId`) 
     REFERENCES `tipos_documentos_identidad` (`tipoDocumentoId`) 
     ON DELETE SET NULL 
     ON UPDATE CASCADE',
    'SELECT "La foreign key ya existe o la columna no se pudo agregar" AS message');

PREPARE stmt_fk_clientes FROM @sql_add_fk_clientes;
EXECUTE stmt_fk_clientes;
DEALLOCATE PREPARE stmt_fk_clientes;

