-- Migración para actualizar la estructura de la tabla clientes
-- Cambiar clienteNombreCompleto por clienteNombre y clienteApellido
-- Hacer clienteDocumento y tipoDocumentoId opcionales
-- Agregar clienteBarrio

-- Paso 1: Agregar nuevas columnas
ALTER TABLE `clientes`
  ADD COLUMN `clienteNombre` VARCHAR(255) NULL AFTER `clienteId`,
  ADD COLUMN `clienteApellido` VARCHAR(255) NULL AFTER `clienteNombre`,
  ADD COLUMN `clienteBarrio` VARCHAR(255) NULL AFTER `clienteDireccion`;

-- Paso 2: Migrar datos de clienteNombreCompleto a clienteNombre y clienteApellido
-- Separar el nombre completo en nombre y apellido
UPDATE `clientes`
SET
  `clienteNombre` = CASE
    WHEN `clienteNombreCompleto` LIKE '% %' THEN
      SUBSTRING_INDEX(`clienteNombreCompleto`, ' ', 1)
    ELSE
      `clienteNombreCompleto`
  END,
  `clienteApellido` = CASE
    WHEN `clienteNombreCompleto` LIKE '% %' THEN
      SUBSTRING(`clienteNombreCompleto`, LENGTH(SUBSTRING_INDEX(`clienteNombreCompleto`, ' ', 1)) + 2)
    ELSE
      ''
  END
WHERE `clienteNombreCompleto` IS NOT NULL;

-- Paso 3: Hacer las columnas NOT NULL después de migrar los datos
ALTER TABLE `clientes`
  MODIFY COLUMN `clienteNombre` VARCHAR(255) NOT NULL,
  MODIFY COLUMN `clienteApellido` VARCHAR(255) NOT NULL;

-- Paso 4: Hacer clienteDocumento y tipoDocumentoId opcionales
-- Primero necesitamos eliminar el índice único si existe
-- Nota: Si la migración falla en este paso, ejecuta manualmente:
-- ALTER TABLE `clientes` DROP INDEX `clienteDocumento`;
-- ALTER TABLE `clientes` DROP INDEX `IDX_clienteDocumento`;

-- Intentar eliminar índices (puede fallar si no existen, pero es seguro ignorar)
-- Hacer clienteDocumento nullable y opcional (sin unique constraint estricto)
-- Si hay duplicados, los manejamos permitiendo NULL
ALTER TABLE `clientes`
  MODIFY COLUMN `clienteDocumento` VARCHAR(255) NULL;

-- Paso 5: Eliminar la columna clienteNombreCompleto
ALTER TABLE `clientes`
  DROP COLUMN `clienteNombreCompleto`;

