-- =====================================================
-- Migración para agregar columnas faltantes a tablas existentes
-- Fecha: 2025-12-10
-- =====================================================

-- Desactivar verificación de foreign keys temporalmente
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- ACTUALIZAR TABLA: sedes
-- =====================================================

-- Agregar sedeCorreo si no existe
ALTER TABLE `sedes` 
ADD COLUMN IF NOT EXISTS `sedeCorreo` varchar(255) DEFAULT NULL AFTER `sedeTelefono`;

-- Agregar sedeFoto si no existe
ALTER TABLE `sedes` 
ADD COLUMN IF NOT EXISTS `sedeFoto` longtext DEFAULT NULL AFTER `sedeCorreo`;

-- =====================================================
-- ACTUALIZAR TABLA: oficinas
-- =====================================================

-- Agregar oficinaCorreo si no existe
ALTER TABLE `oficinas` 
ADD COLUMN IF NOT EXISTS `oficinaCorreo` varchar(255) DEFAULT NULL AFTER `oficinaTelefono`;

-- Agregar oficinaFoto si no existe
ALTER TABLE `oficinas` 
ADD COLUMN IF NOT EXISTS `oficinaFoto` longtext DEFAULT NULL AFTER `oficinaCorreo`;

-- =====================================================
-- ACTUALIZAR TABLA: clientes
-- =====================================================

-- Agregar clienteBarrio si no existe
ALTER TABLE `clientes` 
ADD COLUMN IF NOT EXISTS `clienteBarrio` varchar(255) DEFAULT NULL AFTER `clienteDireccion`;

-- =====================================================
-- ACTUALIZAR TABLA: instalaciones
-- =====================================================

-- Agregar clasificacionId si no existe
ALTER TABLE `instalaciones` 
ADD COLUMN IF NOT EXISTS `clasificacionId` int DEFAULT NULL AFTER `clienteId`;

-- Agregar índice para clasificacionId si no existe
ALTER TABLE `instalaciones` 
ADD INDEX IF NOT EXISTS `FK_instalacion_clasificacion` (`clasificacionId`);

-- Agregar foreign key para clasificacionId si no existe
ALTER TABLE `instalaciones` 
ADD CONSTRAINT IF NOT EXISTS `FK_instalacion_clasificacion` 
FOREIGN KEY (`clasificacionId`) REFERENCES `clasificaciones` (`clasificacionId`) 
ON DELETE NO ACTION ON UPDATE NO ACTION;

-- =====================================================
-- ACTUALIZAR TABLA: proyectos
-- =====================================================

-- Eliminar tipoProyectoId si existe (ya no se usa)
-- Primero eliminar la foreign key si existe
ALTER TABLE `proyectos` 
DROP FOREIGN KEY IF EXISTS `FK_a1900389f6aa7305d2018fc9e18`;

-- Eliminar el índice si existe
ALTER TABLE `proyectos` 
DROP INDEX IF EXISTS `FK_a1900389f6aa7305d2018fc9e18`;

-- Eliminar la columna tipoProyectoId si existe
ALTER TABLE `proyectos` 
DROP COLUMN IF EXISTS `tipoProyectoId`;

-- Agregar usuarioRegistra si no existe
ALTER TABLE `proyectos` 
ADD COLUMN IF NOT EXISTS `usuarioRegistra` int DEFAULT NULL AFTER `proyectoCodigo`;

-- =====================================================
-- ACTUALIZAR TABLA: items_proyecto
-- =====================================================

-- Eliminar materialId si existe (ya no se usa)
-- Primero eliminar la foreign key si existe
ALTER TABLE `items_proyecto` 
DROP FOREIGN KEY IF EXISTS `FK_b4f373909da9224964e354e155c`;

-- Eliminar el índice si existe
ALTER TABLE `items_proyecto` 
DROP INDEX IF EXISTS `FK_b4f373909da9224964e354e155c`;

-- Eliminar la columna materialId si existe
ALTER TABLE `items_proyecto` 
DROP COLUMN IF EXISTS `materialId`;

-- Eliminar itemCantidad si existe (ya no se usa)
ALTER TABLE `items_proyecto` 
DROP COLUMN IF EXISTS `itemCantidad`;

-- Agregar itemNombre si no existe
ALTER TABLE `items_proyecto` 
ADD COLUMN IF NOT EXISTS `itemNombre` varchar(255) NOT NULL AFTER `proyectoId`;

-- Agregar itemCodigo si no existe
ALTER TABLE `items_proyecto` 
ADD COLUMN IF NOT EXISTS `itemCodigo` varchar(255) DEFAULT NULL AFTER `itemNombre`;

-- Agregar usuarioRegistra si no existe
ALTER TABLE `items_proyecto` 
ADD COLUMN IF NOT EXISTS `usuarioRegistra` int DEFAULT NULL AFTER `itemDescripcion`;

-- =====================================================
-- ACTUALIZAR TABLA: grupos
-- =====================================================

-- Modificar el enum de tipoGrupo para incluir 'sede' y 'directo'
-- MySQL no permite modificar ENUM directamente, así que necesitamos recrear la columna
ALTER TABLE `grupos` 
MODIFY COLUMN `tipoGrupo` enum('general','sede','oficina','bodega','instalacion','directo') NOT NULL DEFAULT 'general';

-- =====================================================
-- ACTUALIZAR TABLA: notificaciones
-- =====================================================

-- Modificar el enum de tipoNotificacion para incluir más tipos
ALTER TABLE `notificaciones` 
MODIFY COLUMN `tipoNotificacion` enum('mensaje_nuevo','reaccion_mensaje','instalacion_completada','instalacion_asignada','instalacion_en_proceso','instalacion_cancelada','instalacion_asignacion','instalacion_construccion','instalacion_certificacion','instalacion_novedad','instalacion_anulada','mensaje_respondido','usuario_ingreso_grupo','usuario_salio_grupo') NOT NULL;

-- Reactivar verificación de foreign keys
SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================
