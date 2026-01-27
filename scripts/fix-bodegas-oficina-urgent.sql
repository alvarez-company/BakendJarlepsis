-- Script urgente para eliminar la foreign key constraint de oficinaId en bodegas
-- Ejecutar directamente en la base de datos

-- ============================================
-- 1. ELIMINAR FOREIGN KEY CONSTRAINT
-- ============================================
-- Eliminar la constraint específica que está causando el error
ALTER TABLE `bodegas` DROP FOREIGN KEY `FK_7aa38510f9d318ddd2dff2f0de2`;

-- Si el nombre de la constraint es diferente, usar este query para encontrarlo:
-- SELECT CONSTRAINT_NAME 
-- FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
-- WHERE TABLE_SCHEMA = DATABASE()
--   AND TABLE_NAME = 'bodegas'
--   AND COLUMN_NAME = 'oficinaId'
--   AND CONSTRAINT_NAME IS NOT NULL;

-- ============================================
-- 2. VERIFICAR Y AGREGAR sedeId SI NO EXISTE
-- ============================================
-- Verificar si existe la columna sedeId
SELECT COUNT(*) as sedeId_exists
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'bodegas'
  AND COLUMN_NAME = 'sedeId';

-- Si sedeId no existe, agregarlo
-- ALTER TABLE `bodegas` ADD COLUMN `sedeId` INT NULL AFTER `oficinaId`;

-- Si existe oficinaId, migrar datos (solo si existe tabla oficinas)
-- UPDATE `bodegas` b
-- INNER JOIN `oficinas` o ON b.oficinaId = o.oficinaId
-- SET b.sedeId = o.sedeId
-- WHERE b.sedeId IS NULL;

-- Hacer sedeId NOT NULL después de migrar
-- ALTER TABLE `bodegas` MODIFY COLUMN `sedeId` INT NOT NULL;

-- ============================================
-- 3. ELIMINAR COLUMNA oficinaId
-- ============================================
-- Verificar si existe la columna oficinaId
SELECT COUNT(*) as oficinaId_exists
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'bodegas'
  AND COLUMN_NAME = 'oficinaId';

-- Eliminar la columna oficinaId
ALTER TABLE `bodegas` DROP COLUMN `oficinaId`;

-- ============================================
-- 4. AGREGAR FOREIGN KEY DE sedeId
-- ============================================
-- Verificar si existe la foreign key de sedeId
SELECT CONSTRAINT_NAME 
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'bodegas'
  AND COLUMN_NAME = 'sedeId'
  AND CONSTRAINT_NAME IS NOT NULL;

-- Agregar foreign key de sedeId si no existe
-- ALTER TABLE `bodegas` 
-- ADD CONSTRAINT `fk_bodegas_sede` 
-- FOREIGN KEY (`sedeId`) 
-- REFERENCES `sedes` (`sedeId`) 
-- ON DELETE RESTRICT 
-- ON UPDATE CASCADE;
