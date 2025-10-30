import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class OriginGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const origin = this.reflector.get<string>('origin', context.getHandler());
    if (!origin) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // SuperAdmin puede ver todo
    if (user.usuarioRol?.rolTipo === 'superadmin' || user.role === 'superadmin') {
      return true;
    }

    // Para otros roles, filtrar según su asignación
    return true; // La lógica de filtrado se hace en el servicio
  }
}

