-- Agregar columna de estado a asignaciones_tecnicos
ALTER TABLE `asignaciones_tecnicos`
ADD COLUMN IF NOT EXISTS `asignacionEstado` ENUM('pendiente', 'aprobada', 'rechazada') NOT NULL DEFAULT 'pendiente';

-- Agregar índice para búsquedas por estado
CREATE INDEX IF NOT EXISTS `idx_asignaciones_tecnicos_estado` ON `asignaciones_tecnicos` (`asignacionEstado`);


