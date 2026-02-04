import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';

const IMPERSONATE_HEADER = 'x-impersonate-user-id';

/**
 * Debe usarse después de JwtAuthGuard.
 * Si el usuario autenticado es superadmin y la petición trae el header
 * X-Impersonate-User-Id, reemplaza req.user por el usuario personificado
 * para que la autorización y filtros se apliquen como ese usuario.
 */
@Injectable()
export class ImpersonationGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: any }>();
    const user = request.user;
    if (!user) return true;

    const rolTipo = user?.usuarioRol?.rolTipo ?? user?.role ?? '';
    if (rolTipo !== 'superadmin') return true;

    const impersonateIdRaw = request.headers[IMPERSONATE_HEADER];
    if (!impersonateIdRaw) return true;

    const impersonateId = parseInt(String(impersonateIdRaw).trim(), 10);
    if (Number.isNaN(impersonateId) || impersonateId <= 0) return true;

    const impersonatedUser = await this.usersService.findOneForAuth(impersonateId);
    if (!impersonatedUser || !impersonatedUser.usuarioEstado) return true;

    request.user = impersonatedUser;
    return true;
  }
}
