-- Migración para actualizar el enum de rolTipo en la tabla roles
-- Agrega los nuevos roles al enum existente
-- Fecha: 2025-01-XX

-- Actualizar el ENUM para incluir todos los roles nuevos y legacy
ALTER TABLE `roles`
  MODIFY COLUMN `rolTipo` ENUM(
    'superadmin',
    'admin',
    'administrador',
    'tecnico',
    'soldador',
    'almacenista',
    'bodega',
    'bodega-internas',
    'bodega-redes',
    'empleado',
    'inventario',
    'traslados',
    'devoluciones',
    'salidas',
    'entradas',
    'instalaciones'
  ) NOT NULL;

SELECT 'Migración completada. El ENUM rolTipo ahora incluye todos los roles nuevos y legacy.' AS resultado;

