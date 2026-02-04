import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>(Roles, context.getHandler());
    if (!roles || roles.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const userRole = (user?.usuarioRol?.rolTipo ?? user?.role ?? '').toString().toLowerCase();
    if (!userRole) {
      return false;
    }
    return roles.some((role) => (role ?? '').toString().toLowerCase() === userRole);
  }
}
