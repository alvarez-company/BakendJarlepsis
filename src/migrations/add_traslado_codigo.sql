-- Migración para agregar trasladoCodigo a la tabla traslados
-- Fecha: 2025-11-05
-- Descripción: Agregar columna para agrupar múltiples traslados

-- Agregar columna trasladoCodigo
ALTER TABLE traslados
ADD COLUMN trasladoCodigo VARCHAR(100) NULL;

-- Agregar índice para mejorar búsquedas
CREATE INDEX idx_traslados_trasladoCodigo ON traslados(trasladoCodigo);

