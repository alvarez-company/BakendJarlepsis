-- Migración: Mover bodegas de oficinas a sedes directamente
-- Fecha: 2025-12-05
-- Descripción: Elimina la jerarquía de oficinas y hace que las bodegas pertenezcan directamente a las sedes

-- ============================================
-- 1. AGREGAR COLUMNA sedeId A bodegas
-- ============================================
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bodegas'
    AND COLUMN_NAME = 'sedeId'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `bodegas` ADD COLUMN `sedeId` INT NULL AFTER `oficinaId`',
  'SELECT "La columna sedeId ya existe en bodegas" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 2. MIGRAR DATOS: Obtener sedeId desde oficinas
-- ============================================
UPDATE `bodegas` b
INNER JOIN `oficinas` o ON b.oficinaId = o.oficinaId
SET b.sedeId = o.sedeId
WHERE b.sedeId IS NULL;

-- ============================================
-- 3. ACTUALIZAR usuarios: Migrar usuarioOficina a usuarioSede si no tiene sede
-- ============================================
UPDATE `usuarios` u
INNER JOIN `oficinas` o ON u.usuarioOficina = o.oficinaId
SET u.usuarioSede = o.sedeId
WHERE u.usuarioOficina IS NOT NULL 
  AND (u.usuarioSede IS NULL OR u.usuarioSede = 0);

-- ============================================
-- 4. ELIMINAR FOREIGN KEY Y COLUMNA oficinaId DE bodegas
-- ============================================
-- Obtener el nombre de la foreign key
SET @fk_name = (
  SELECT CONSTRAINT_NAME 
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bodegas'
    AND COLUMN_NAME = 'oficinaId'
    AND CONSTRAINT_NAME IS NOT NULL
  LIMIT 1
);

-- Eliminar foreign key si existe
SET @sql_fk = IF(@fk_name IS NOT NULL,
  CONCAT('ALTER TABLE `bodegas` DROP FOREIGN KEY `', @fk_name, '`'),
  'SELECT "No hay foreign key de oficina en bodegas" AS message'
);

PREPARE stmt_fk FROM @sql_fk;
EXECUTE stmt_fk;
DEALLOCATE PREPARE stmt_fk;

-- Eliminar columna oficinaId
SET @col_oficina_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bodegas'
    AND COLUMN_NAME = 'oficinaId'
);

SET @sql_drop = IF(@col_oficina_exists > 0,
  'ALTER TABLE `bodegas` DROP COLUMN `oficinaId`',
  'SELECT "La columna oficinaId ya no existe en bodegas" AS message'
);

PREPARE stmt_drop FROM @sql_drop;
EXECUTE stmt_drop;
DEALLOCATE PREPARE stmt_drop;

-- ============================================
-- 5. HACER sedeId OBLIGATORIO EN bodegas
-- ============================================
ALTER TABLE `bodegas` 
MODIFY COLUMN `sedeId` INT NOT NULL;

-- ============================================
-- 6. AGREGAR FOREIGN KEY DE sedeId EN bodegas
-- ============================================
SET @fk_sede_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bodegas'
    AND CONSTRAINT_NAME LIKE '%sede%'
);

SET @sql_fk_sede = IF(@fk_sede_exists = 0,
  'ALTER TABLE `bodegas` ADD CONSTRAINT `fk_bodegas_sede` FOREIGN KEY (`sedeId`) REFERENCES `sedes` (`sedeId`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT "La foreign key de sede ya existe en bodegas" AS message'
);

PREPARE stmt_fk_sede FROM @sql_fk_sede;
EXECUTE stmt_fk_sede;
DEALLOCATE PREPARE stmt_fk_sede;

-- ============================================
-- 7. ELIMINAR COLUMNA usuarioOficina DE usuarios
-- ============================================
-- Obtener el nombre de la foreign key
SET @fk_usuario_name = (
  SELECT CONSTRAINT_NAME 
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'usuarios'
    AND COLUMN_NAME = 'usuarioOficina'
    AND CONSTRAINT_NAME IS NOT NULL
  LIMIT 1
);

-- Eliminar foreign key si existe
SET @sql_fk_usuario = IF(@fk_usuario_name IS NOT NULL,
  CONCAT('ALTER TABLE `usuarios` DROP FOREIGN KEY `', @fk_usuario_name, '`'),
  'SELECT "No hay foreign key de oficina en usuarios" AS message'
);

PREPARE stmt_fk_usuario FROM @sql_fk_usuario;
EXECUTE stmt_fk_usuario;
DEALLOCATE PREPARE stmt_fk_usuario;

-- Eliminar columna usuarioOficina
SET @col_usuario_oficina_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'usuarios'
    AND COLUMN_NAME = 'usuarioOficina'
);

SET @sql_drop_usuario = IF(@col_usuario_oficina_exists > 0,
  'ALTER TABLE `usuarios` DROP COLUMN `usuarioOficina`',
  'SELECT "La columna usuarioOficina ya no existe en usuarios" AS message'
);

PREPARE stmt_drop_usuario FROM @sql_drop_usuario;
EXECUTE stmt_drop_usuario;
DEALLOCATE PREPARE stmt_drop_usuario;

-- ============================================
-- NOTA: La tabla oficinas se mantiene por ahora para referencia histórica
-- pero ya no se usará en la aplicación. Se puede eliminar manualmente más adelante
-- si se confirma que no hay datos históricos importantes.
-- ============================================
