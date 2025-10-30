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
        // Solo ve recursos de su oficina
        return resource.filter(item => 
          item.oficinaId === user.usuarioOficina || 
          item.oficina?.oficinaId === user.usuarioOficina
        );

      case 'bodega':
        // Solo ve recursos de su bodega
        return resource.filter(item => 
          item.bodegaId === user.usuarioBodega ||
          item.bodega?.bodegaId === user.usuarioBodega
        );

      case 'tecnico':
        // Solo ve sus instalaciones asignadas
        return resource.filter(item => 
          item.usuarioTecnicoId === user.usuarioId ||
          item.tecnico?.usuarioId === user.usuarioId
        );

      default:
        return resource;
    }
  }
}

