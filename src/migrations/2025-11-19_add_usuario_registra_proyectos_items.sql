-- Migración para agregar usuarioRegistra a proyectos e items_proyecto
-- Fecha: 2025-11-19
-- Descripción:
--   - Agregar columna usuarioRegistra a proyectos
--   - Agregar columna usuarioRegistra a items_proyecto

-- Agregar usuarioRegistra a proyectos
SET @col_exists_proyecto = (SELECT COUNT(*)
                            FROM information_schema.COLUMNS
                            WHERE TABLE_SCHEMA = DATABASE()
                            AND TABLE_NAME = 'proyectos'
                            AND COLUMN_NAME = 'usuarioRegistra');

SET @sql_add_col_proyecto = IF(@col_exists_proyecto = 0,
    'ALTER TABLE `proyectos` ADD `usuarioRegistra` int NULL AFTER `proyectoEstado`',
    'SELECT "La columna usuarioRegistra ya existe en la tabla proyectos" AS message');

PREPARE stmt_add_col_proyecto FROM @sql_add_col_proyecto;
EXECUTE stmt_add_col_proyecto;
DEALLOCATE PREPARE stmt_add_col_proyecto;

-- Agregar foreign key a usuarioRegistra en proyectos
SET @fk_exists_proyecto = (SELECT COUNT(*)
                           FROM information_schema.TABLE_CONSTRAINTS
                           WHERE CONSTRAINT_SCHEMA = DATABASE()
                           AND TABLE_NAME = 'proyectos'
                           AND CONSTRAINT_NAME = 'FK_proyectos_usuarioRegistra');

SET @sql_add_fk_proyecto = IF(@fk_exists_proyecto = 0 AND @col_exists_proyecto = 0,
    'ALTER TABLE `proyectos` ADD CONSTRAINT `FK_proyectos_usuarioRegistra` FOREIGN KEY (`usuarioRegistra`) REFERENCES `usuarios`(`usuarioId`) ON DELETE NO ACTION ON UPDATE NO ACTION',
    'SELECT "La foreign key FK_proyectos_usuarioRegistra ya existe o la columna no se agregó" AS message');

PREPARE stmt_add_fk_proyecto FROM @sql_add_fk_proyecto;
EXECUTE stmt_add_fk_proyecto;
DEALLOCATE PREPARE stmt_add_fk_proyecto;

-- Agregar usuarioRegistra a items_proyecto
SET @col_exists_item = (SELECT COUNT(*)
                        FROM information_schema.COLUMNS
                        WHERE TABLE_SCHEMA = DATABASE()
                        AND TABLE_NAME = 'items_proyecto'
                        AND COLUMN_NAME = 'usuarioRegistra');

SET @sql_add_col_item = IF(@col_exists_item = 0,
    'ALTER TABLE `items_proyecto` ADD `usuarioRegistra` int NULL AFTER `itemEstado`',
    'SELECT "La columna usuarioRegistra ya existe en la tabla items_proyecto" AS message');

PREPARE stmt_add_col_item FROM @sql_add_col_item;
EXECUTE stmt_add_col_item;
DEALLOCATE PREPARE stmt_add_col_item;

-- Agregar foreign key a usuarioRegistra en items_proyecto
SET @fk_exists_item = (SELECT COUNT(*)
                       FROM information_schema.TABLE_CONSTRAINTS
                       WHERE CONSTRAINT_SCHEMA = DATABASE()
                       AND TABLE_NAME = 'items_proyecto'
                       AND CONSTRAINT_NAME = 'FK_items_proyecto_usuarioRegistra');

SET @sql_add_fk_item = IF(@fk_exists_item = 0 AND @col_exists_item = 0,
    'ALTER TABLE `items_proyecto` ADD CONSTRAINT `FK_items_proyecto_usuarioRegistra` FOREIGN KEY (`usuarioRegistra`) REFERENCES `usuarios`(`usuarioId`) ON DELETE NO ACTION ON UPDATE NO ACTION',
    'SELECT "La foreign key FK_items_proyecto_usuarioRegistra ya existe o la columna no se agregó" AS message');

PREPARE stmt_add_fk_item FROM @sql_add_fk_item;
EXECUTE stmt_add_fk_item;
DEALLOCATE PREPARE stmt_add_fk_item;

