-- Migración para crear tabla unidades_medida y actualizar materiales

-- Paso 1: Crear tabla unidades_medida
CREATE TABLE IF NOT EXISTS `unidades_medida` (
  `unidadMedidaId` INT NOT NULL AUTO_INCREMENT,
  `unidadMedidaNombre` VARCHAR(255) NOT NULL,
  `unidadMedidaSimbolo` VARCHAR(255) NULL,
  `unidadMedidaEstado` TINYINT NOT NULL DEFAULT 1,
  `usuarioRegistra` INT NULL,
  `fechaCreacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechaActualizacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`unidadMedidaId`),
  UNIQUE KEY `unidadMedidaNombre` (`unidadMedidaNombre`),
  KEY `FK_usuario_registra` (`usuarioRegistra`),
  CONSTRAINT `FK_unidad_medida_usuario` FOREIGN KEY (`usuarioRegistra`) REFERENCES `usuarios` (`usuarioId`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Paso 2: Insertar unidades de medida iniciales desde el enum
INSERT INTO `unidades_medida` (`unidadMedidaNombre`, `unidadMedidaSimbolo`, `unidadMedidaEstado`, `usuarioRegistra`, `fechaCreacion`, `fechaActualizacion`)
VALUES
  ('Unidad', 'u', 1, NULL, NOW(), NOW()),
  ('Kilogramo', 'kg', 1, NULL, NOW(), NOW()),
  ('Gramo', 'g', 1, NULL, NOW(), NOW()),
  ('Litro', 'l', 1, NULL, NOW(), NOW()),
  ('Metro', 'm', 1, NULL, NOW(), NOW()),
  ('Caja', 'caja', 1, NULL, NOW(), NOW()),
  ('Paquete', 'paq', 1, NULL, NOW(), NOW())
ON DUPLICATE KEY UPDATE `unidadMedidaNombre` = `unidadMedidaNombre`;

-- Paso 3: Agregar columna unidadMedidaId a materiales (nullable primero)
ALTER TABLE `materiales`
  ADD COLUMN `unidadMedidaId` INT NULL AFTER `materialPrecio`;

-- Paso 4: Migrar datos del enum a la nueva columna unidadMedidaId
UPDATE `materiales` m
INNER JOIN `unidades_medida` um ON 
  CASE m.materialUnidadMedida
    WHEN 'unidad' THEN um.unidadMedidaNombre = 'Unidad'
    WHEN 'kg' THEN um.unidadMedidaNombre = 'Kilogramo'
    WHEN 'g' THEN um.unidadMedidaNombre = 'Gramo'
    WHEN 'litro' THEN um.unidadMedidaNombre = 'Litro'
    WHEN 'metro' THEN um.unidadMedidaNombre = 'Metro'
    WHEN 'caja' THEN um.unidadMedidaNombre = 'Caja'
    WHEN 'paquete' THEN um.unidadMedidaNombre = 'Paquete'
  END
SET m.unidadMedidaId = um.unidadMedidaId
WHERE m.materialUnidadMedida IS NOT NULL;

-- Paso 5: Si algún material no tiene unidadMedidaId, asignar 'Unidad' por defecto
UPDATE `materiales`
SET `unidadMedidaId` = (SELECT `unidadMedidaId` FROM `unidades_medida` WHERE `unidadMedidaNombre` = 'Unidad' LIMIT 1)
WHERE `unidadMedidaId` IS NULL;

-- Paso 6: Agregar foreign key constraint
ALTER TABLE `materiales`
  ADD CONSTRAINT `FK_material_unidad_medida` 
  FOREIGN KEY (`unidadMedidaId`) 
  REFERENCES `unidades_medida` (`unidadMedidaId`) 
  ON DELETE SET NULL;

-- Paso 7: NO eliminamos materialUnidadMedida todavía para mantener compatibilidad
-- Se puede eliminar después de verificar que todo funciona correctamente
-- ALTER TABLE `materiales` DROP COLUMN `materialUnidadMedida`;

