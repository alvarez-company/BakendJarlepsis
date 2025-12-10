-- Migración para agregar teléfono y correo a sedes, oficinas y bodegas

-- Paso 1: Agregar sedeCorreo a sedes
ALTER TABLE `sedes`
  ADD COLUMN `sedeCorreo` VARCHAR(255) NULL AFTER `sedeTelefono`;

-- Paso 2: Agregar oficinaCorreo a oficinas
ALTER TABLE `oficinas`
  ADD COLUMN `oficinaCorreo` VARCHAR(255) NULL AFTER `oficinaTelefono`;

-- Paso 3: Agregar bodegaTelefono y bodegaCorreo a bodegas
ALTER TABLE `bodegas`
  ADD COLUMN `bodegaTelefono` VARCHAR(255) NULL AFTER `bodegaUbicacion`,
  ADD COLUMN `bodegaCorreo` VARCHAR(255) NULL AFTER `bodegaTelefono`;

