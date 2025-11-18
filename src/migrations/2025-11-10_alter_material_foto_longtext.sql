-- Migración para ajustar la columna materialFoto y permitir almacenar base64
-- Fecha: 2025-11-10
-- Descripción:
--   - Cambiar el tipo de la columna materialFoto a LONGTEXT para soportar cadenas base64 de gran tamaño.

ALTER TABLE materiales
MODIFY COLUMN materialFoto LONGTEXT NULL;
