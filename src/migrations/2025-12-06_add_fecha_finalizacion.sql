-- Agregar columna fechaFinalizacion a la tabla instalaciones
ALTER TABLE instalaciones 
ADD COLUMN fechaFinalizacion DATETIME NULL AFTER fechaNovedad;

