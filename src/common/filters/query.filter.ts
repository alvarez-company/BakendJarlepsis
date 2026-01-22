import { Injectable } from '@nestjs/common';
import { UsersService } from '../../modules/users/users.service';

@Injectable()
export class QueryFilter {
  constructor(private usersService: UsersService) {}

  async filterByUserScope(user: any, resource: any[]): Promise<any[]> {
    const userRole = user.usuarioRol?.rolTipo || user.role;

    switch (userRole) {
      case 'superadmin':
        return resource; // Ve todo

      case 'admin':
        // Solo ve recursos de su sede (centro operativo)
        return resource.filter(
          (item) =>
            item.sedeId === user.usuarioSede ||
            item.sede?.sedeId === user.usuarioSede ||
            item.bodega?.sedeId === user.usuarioSede,
        );

      case 'administrador':
        // Administrador (Centro Operativo) - solo lectura, ve todo
        return resource;

      case 'bodega':
        // Solo ve recursos de su bodega
        return resource.filter(
          (item) =>
            item.bodegaId === user.usuarioBodega || item.bodega?.bodegaId === user.usuarioBodega,
        );

      case 'bodega-internas':
        // Solo ve recursos de bodegas de tipo internas
        return resource.filter((item) => {
          const bodegaTipo = item.bodegaTipo || item.bodega?.bodegaTipo;
          return (
            bodegaTipo === 'internas' ||
            (user.usuarioBodega &&
              (item.bodegaId === user.usuarioBodega ||
                item.bodega?.bodegaId === user.usuarioBodega))
          );
        });

      case 'bodega-redes':
        // Solo ve recursos de bodegas de tipo redes
        return resource.filter((item) => {
          const bodegaTipo = item.bodegaTipo || item.bodega?.bodegaTipo;
          return (
            bodegaTipo === 'redes' ||
            (user.usuarioBodega &&
              (item.bodegaId === user.usuarioBodega ||
                item.bodega?.bodegaId === user.usuarioBodega))
          );
        });

      case 'almacenista':
        // Almacenista ve recursos de su sede
        return resource.filter(
          (item) =>
            item.sedeId === user.usuarioSede ||
            item.sede?.sedeId === user.usuarioSede ||
            item.bodega?.sedeId === user.usuarioSede,
        );

      case 'tecnico':
      case 'soldador':
        // Solo ve sus instalaciones asignadas
        return resource.filter(
          (item) =>
            item.usuarioTecnicoId === user.usuarioId ||
            item.tecnico?.usuarioId === user.usuarioId ||
            (item.usuariosAsignados &&
              Array.isArray(item.usuariosAsignados) &&
              item.usuariosAsignados.some((ua: any) => {
                const usuarioId = ua.usuarioId || ua.usuario?.usuarioId;
                const activo = ua.activo !== undefined ? ua.activo : true;
                return usuarioId === user.usuarioId && activo === true;
              })),
        );

      default:
        return resource;
    }
  }
}
