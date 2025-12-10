-- Migración para actualizar estructura de clientes e instalaciones
-- y agregar inventario de técnicos y materiales utilizados en instalaciones
-- Fecha: 2025-01-XX

-- ============================================
-- 1. ACTUALIZAR TABLA CLIENTES
-- ============================================
-- Agregar columna clienteCodigo
ALTER TABLE `clientes`
ADD COLUMN `clienteCodigo` VARCHAR(255) NULL AFTER `clienteTelefono`;

-- Migrar datos de instalacionCodigo a clienteCodigo
-- Primero actualizar clientes que tengan instalaciones
UPDATE `clientes` c
INNER JOIN (
  SELECT clienteId, instalacionCodigo
  FROM `instalaciones`
  WHERE instalacionCodigo IS NOT NULL
  GROUP BY clienteId
  ORDER BY instalacionId DESC
) i ON c.clienteId = i.clienteId
SET c.clienteCodigo = i.instalacionCodigo
WHERE c.clienteCodigo IS NULL;

-- Hacer clienteCodigo único después de migrar
ALTER TABLE `clientes`
MODIFY COLUMN `clienteCodigo` VARCHAR(255) NULL,
ADD UNIQUE INDEX `idx_clienteCodigo` (`clienteCodigo`);

-- Eliminar columnas que ya no se usan
ALTER TABLE `clientes`
DROP COLUMN IF EXISTS `clienteCorreo`,
DROP COLUMN IF EXISTS `tipoDocumentoId`,
DROP COLUMN IF EXISTS `clienteDocumento`;

-- Eliminar foreign key si existe
SET @fk_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'clientes'
    AND CONSTRAINT_NAME LIKE '%tipoDocumento%'
);
SET @sql_drop_fk = IF(@fk_exists > 0,
  'ALTER TABLE `clientes` DROP FOREIGN KEY `FK_clientes_tipoDocumento`',
  'SELECT "FK no existe" AS message'
);
PREPARE stmt_drop_fk FROM @sql_drop_fk;
EXECUTE stmt_drop_fk;
DEALLOCATE PREPARE stmt_drop_fk;

-- ============================================
-- 2. ACTUALIZAR TABLA INSTALACIONES
-- ============================================
-- Eliminar columnas que ya no se usan
ALTER TABLE `instalaciones`
DROP COLUMN IF EXISTS `instalacionCodigo`,
DROP COLUMN IF EXISTS `instalacionHoraInicio`,
DROP COLUMN IF EXISTS `instalacionHoraFinal`;

-- ============================================
-- 3. CREAR TABLA INVENTARIO_TECNICOS
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
-- 4. CREAR TABLA INSTALACIONES_MATERIALES
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

