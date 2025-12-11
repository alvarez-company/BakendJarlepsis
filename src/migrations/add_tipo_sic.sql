-- Script para agregar el tipo de documento SIC
-- Este script solo inserta el nuevo tipo sin afectar los existentes

INSERT IGNORE INTO `tipos_documentos_identidad` 
  (`tipoDocumentoCodigo`, `tipoDocumentoNombre`, `tipoDocumentoDescripcion`, `tipoDocumentoEstado`) 
VALUES
  ('SIC', 'SIC', 'Sistema de Identificación de Clientes', 1);
