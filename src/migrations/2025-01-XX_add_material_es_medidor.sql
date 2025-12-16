-- Agregar campo materialEsMedidor a la tabla materiales
-- Este campo indica si un material es un medidor que requiere números únicos

ALTER TABLE materiales
ADD COLUMN materialEsMedidor BOOLEAN DEFAULT FALSE NOT NULL AFTER materialEstado;

-- Actualizar materiales existentes que tengan números de medidor asignados
-- para marcar materialEsMedidor como TRUE (solo si la tabla numeros_medidor existe)
SET @table_exists = (
  SELECT COUNT(*) 
  FROM information_schema.tables 
  WHERE table_schema = DATABASE() 
  AND table_name = 'numeros_medidor'
);

SET @update_sql = IF(@table_exists > 0,
  'UPDATE materiales m
   INNER JOIN numeros_medidor nm ON m.materialId = nm.materialId
   SET m.materialEsMedidor = TRUE
   WHERE m.materialEsMedidor = FALSE',
  'SELECT 1 as skip_update'
);

PREPARE stmt FROM @update_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

