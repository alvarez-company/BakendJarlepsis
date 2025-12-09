-- Agregar 'finalizada' al enum de estado de instalaciones
ALTER TABLE `instalaciones` 
MODIFY COLUMN `estado` ENUM('pendiente', 'en_proceso', 'completada', 'finalizada', 'cancelada') NOT NULL DEFAULT 'pendiente';

