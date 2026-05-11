/**
 * Constantes centralizadas de roles para control de acceso.
 * Única fuente de verdad para qué roles pueden acceder a cada funcionalidad.
 *
 * Uso en controladores: @Roles(...ROLES_CREAR_USUARIO)
 */

/** Roles que pueden crear usuarios (solo admin de centro, superadmin y gerencia) */
export const ROLES_CREAR_USUARIO = ['superadmin', 'gerencia', 'admin'] as const;

/** Roles que pueden listar/ver usuarios */
export const ROLES_VER_USUARIOS = [
  'superadmin',
  'gerencia',
  'admin',
  'admin-internas',
  'admin-redes',
  'bodega-internas',
  'bodega-redes',
] as const;

/** Roles que pueden actualizar usuarios */
export const ROLES_ACTUALIZAR_USUARIO = [
  'superadmin',
  'gerencia',
  'admin',
  'admin-internas',
  'admin-redes',
  'bodega-internas',
  'bodega-redes',
] as const;

/** Roles que pueden eliminar usuarios (solo SuperAdmin/Gerencia) */
export const ROLES_ELIMINAR_USUARIO = ['superadmin', 'gerencia'] as const;

/** Roles que pueden cambiar rol de un usuario */
export const ROLES_CAMBIAR_ROL = ['superadmin', 'gerencia'] as const;

/** Roles que pueden actualizar estado/cancelar contrato de usuario */
export const ROLES_GESTION_ESTADO_USUARIO = ['superadmin', 'gerencia', 'admin'] as const;

/** Roles que pueden gestionar asignaciones de técnicos */
export const ROLES_ASIGNACIONES_TECNICOS = [
  'superadmin',
  'admin',
  'admin-internas',
  'admin-redes',
  'almacenista',
  'bodega-internas',
  'bodega-redes',
] as const;

/** Roles que pueden ver asignaciones (incluye técnico/soldador para las propias) */
export const ROLES_VER_ASIGNACIONES = [
  'superadmin',
  'admin',
  'admin-internas',
  'admin-redes',
  'almacenista',
  'bodega-internas',
  'bodega-redes',
  'tecnico',
  'soldador',
] as const;

/** Roles que pueden crear/actualizar/eliminar asignaciones */
export const ROLES_EDITAR_ASIGNACIONES = [
  'superadmin',
  'admin',
  'almacenista',
  'bodega-internas',
  'bodega-redes',
] as const;

/** Roles que pueden aprobar/rechazar asignaciones */
export const ROLES_APROBAR_ASIGNACIONES = ['superadmin', 'admin', 'almacenista'] as const;

/** Roles que pueden gestionar sedes (centros operativos) */
export const ROLES_GESTION_SEDES = ['superadmin', 'gerencia'] as const;

/** Roles que pueden ver sedes */
export const ROLES_VER_SEDES = [
  'superadmin',
  'gerencia',
  'admin',
  'admin-internas',
  'admin-redes',
] as const;

/** Roles que pueden gestionar bodegas */
export const ROLES_GESTION_BODEGAS = [
  'superadmin',
  'admin',
  'admin-internas',
  'admin-redes',
] as const;

/** Roles que pueden ver bodegas */
export const ROLES_VER_BODEGAS = [
  'superadmin',
  'gerencia',
  'admin',
  'admin-internas',
  'admin-redes',
  'almacenista',
  'bodega-internas',
  'bodega-redes',
  'tecnico',
  'soldador',
] as const;

/** Roles que pueden eliminar bodegas (solo Gerencia) */
export const ROLES_ELIMINAR_BODEGA = ['superadmin', 'gerencia'] as const;

/** Roles que solo SuperAdmin/Gerencia usan (crear/eliminar catálogos críticos) */
export const ROLES_SUPERADMIN_GERENCIA = ['superadmin', 'gerencia'] as const;

/** Roles que crean/editan materiales, inventarios, movimientos, traslados (almacenista) */
export const ROLES_ALMACENISTA = ['superadmin', 'almacenista'] as const;

/** Roles que ven materiales, inventarios, movimientos (operativos) */
export const ROLES_VER_MATERIALES_INVENTARIO = [
  'superadmin',
  'admin',
  'admin-internas',
  'admin-redes',
  'almacenista',
  'tecnico',
  'soldador',
  'bodega-internas',
  'bodega-redes',
] as const;

/** Roles que ven materiales pero sin bodega (para findByCodigo, etc.) */
export const ROLES_VER_MOVIMIENTOS_CODIGO = [
  'superadmin',
  'admin',
  'admin-internas',
  'admin-redes',
  'almacenista',
  'tecnico',
  'soldador',
] as const;

/** Roles que ven historial por bodega/sede (sin técnico/soldador en algunos casos) */
export const ROLES_VER_HISTORIAL_BODEGA = [
  'superadmin',
  'admin',
  'admin-internas',
  'admin-redes',
  'almacenista',
  'bodega-internas',
  'bodega-redes',
] as const;

/** Roles que crean/editan traslados */
export const ROLES_TRASLADOS_EDITAR = ['superadmin', 'almacenista'] as const;

/** Roles que ven traslados */
export const ROLES_VER_TRASLADOS = [
  'superadmin',
  'admin',
  'admin-internas',
  'admin-redes',
  'almacenista',
  'tecnico',
  'soldador',
  'bodega-internas',
  'bodega-redes',
] as const;

/** Roles que crean/editan inventario técnico */
export const ROLES_INVENTARIO_TECNICO_EDITAR = ['superadmin', 'almacenista'] as const;

/** Roles que ven inventario técnico */
export const ROLES_VER_INVENTARIO_TECNICO = [
  'superadmin',
  'admin',
  'almacenista',
  'tecnico',
  'soldador',
  'bodega-internas',
  'bodega-redes',
] as const;

/** Roles de instalaciones (crear, ver, actualizar estado) */
export const ROLES_INSTALACIONES = [
  'superadmin',
  'admin',
  'admin-internas',
  'admin-redes',
  'almacenista',
  'tecnico',
  'soldador',
  'bodega-internas',
  'bodega-redes',
] as const;

/** Roles que editan instalaciones (update, sin almacenista) */
export const ROLES_EDITAR_INSTALACIONES = [
  'superadmin',
  'admin',
  'admin-internas',
  'admin-redes',
  'tecnico',
  'soldador',
  'bodega-internas',
  'bodega-redes',
] as const;

/** Roles que eliminan instalaciones (solo bodega) */
export const ROLES_ELIMINAR_INSTALACIONES = [
  'superadmin',
  'bodega-internas',
  'bodega-redes',
] as const;

/** Roles que asignan usuarios a instalaciones */
export const ROLES_ASIGNAR_INSTALACIONES = [
  'superadmin',
  'admin',
  'admin-internas',
  'admin-redes',
  'bodega-internas',
  'bodega-redes',
] as const;

/** Roles que gestionan categorías (crear, actualizar) */
export const ROLES_GESTION_CATEGORIAS = ['superadmin', 'admin'] as const;

/** Roles que ven categorías */
export const ROLES_VER_CATEGORIAS = [
  'superadmin',
  'admin',
  'almacenista',
  'tecnico',
  'soldador',
  'bodega-internas',
  'bodega-redes',
] as const;

/** Roles para departamentos (crear/update/delete gerencia, ver admin) */
export const ROLES_VER_DEPARTAMENTOS = ['superadmin', 'admin'] as const;

/** Roles para items-proyecto (crear/update admin, ver incluye tecnico/soldador) */
export const ROLES_ITEMS_PROYECTO_EDITAR = ['superadmin', 'admin'] as const;

/** Roles que ven items de proyecto */
export const ROLES_VER_ITEMS_PROYECTO = ['superadmin', 'admin', 'tecnico', 'soldador'] as const;

/** Roles para chat/mensajes (todos los operativos) */
export const ROLES_CHAT = [
  'superadmin',
  'gerencia',
  'admin',
  'admin-internas',
  'admin-redes',
  'almacenista',
  'tecnico',
  'soldador',
  'bodega-internas',
  'bodega-redes',
] as const;

/** Roles que gestionan grupos (sincronizar) */
export const ROLES_SINCRONIZAR_GRUPOS = ['superadmin', 'gerencia'] as const;

/** Roles que asignan material (numeros medidor, etc.) */
export const ROLES_ASIGNAR_MATERIAL = ['superadmin', 'admin', 'almacenista'] as const;

/** Roles que gestionan proyectos (crear, actualizar) */
export const ROLES_PROYECTOS_EDITAR = [
  'superadmin',
  'admin',
  'admin-internas',
  'admin-redes',
  'bodega-internas',
  'bodega-redes',
] as const;

/** Roles que ven proyectos */
export const ROLES_VER_PROYECTOS = [
  'superadmin',
  'admin',
  'admin-internas',
  'admin-redes',
  'almacenista',
  'tecnico',
  'soldador',
  'bodega-internas',
  'bodega-redes',
] as const;

/** Roles que eliminan proyectos (bodega) */
export const ROLES_ELIMINAR_PROYECTOS = ['superadmin', 'bodega-internas', 'bodega-redes'] as const;

/** Roles que ven catálogos solo admin (paises, roles, tipos-documento) */
export const ROLES_VER_CATALOGOS_ADMIN = ['superadmin', 'admin'] as const;

/** Roles que gestionan municipios (crear, actualizar) */
export const ROLES_GESTION_MUNICIPIOS = ['superadmin', 'admin'] as const;

/** Roles que ven proveedores (admin + tecnico/soldador) */
export const ROLES_VER_PROVEEDORES = ['superadmin', 'admin', 'tecnico', 'soldador'] as const;

/** Roles que actualizan clientes (sin bodegas/tecnico/soldador) */
export const ROLES_CLIENTES_UPDATE = [
  'superadmin',
  'admin',
  'admin-internas',
  'admin-redes',
  'almacenista',
] as const;

/** Roles que exportan clientes */
export const ROLES_CLIENTES_EXPORT = [
  'superadmin',
  'admin',
  'admin-internas',
  'admin-redes',
  'almacenista',
] as const;

/** Roles para tipos-instalacion (gestionar y ver) */
export const ROLES_TIPOS_INSTALACION = [
  'superadmin',
  'admin',
  'admin-internas',
  'admin-redes',
  'bodega-internas',
  'bodega-redes',
] as const;

/** Roles para tipos-proyecto (crear, actualizar) */
export const ROLES_TIPOS_PROYECTO_EDITAR = ['superadmin', 'admin'] as const;

/** Roles instalaciones-materiales (admin + tecnico/soldador + almacenista) */
export const ROLES_INSTALACIONES_MATERIALES = [
  'superadmin',
  'admin',
  'tecnico',
  'soldador',
  'almacenista',
] as const;

/** Roles auditoria inventario */
export const ROLES_AUDITORIA_INVENTARIO = ['superadmin', 'admin', 'almacenista'] as const;

/** Roles estados cliente/instalacion (admin + tecnico) */
export const ROLES_ESTADOS_CAMPO = ['superadmin', 'admin', 'tecnico'] as const;

/** Roles que pueden ver técnicos de su centro (almacenista) */
export const ROLES_VER_TECNICOS_CENTRO = ['almacenista'] as const;

/** Roles que pueden ver usuarios (incluye almacenista para endpoint específico) */
export const ROLES_VER_USUARIOS_CON_ALMACENISTA = [
  'superadmin',
  'gerencia',
  'admin',
  'admin-internas',
  'admin-redes',
  'bodega-internas',
  'bodega-redes',
  'almacenista',
] as const;

/** Roles para exportar reporte Metrogas (sedes + gerencia) */
export const ROLES_EXPORT_METROGAS = [
  'superadmin',
  'gerencia',
  'admin',
  'admin-internas',
  'admin-redes',
] as const;

/** Roles que ven números medidor */
export const ROLES_NUMEROS_MEDIDOR = [
  'superadmin',
  'gerencia',
  'admin',
  'admin-internas',
  'admin-redes',
  'almacenista',
  'tecnico',
  'soldador',
  'bodega-internas',
  'bodega-redes',
] as const;
