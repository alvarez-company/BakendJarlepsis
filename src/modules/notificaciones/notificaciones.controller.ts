import { Controller, Get, Post, Param, UseGuards, Request, Query, Delete } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificacionesService } from './notificaciones.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES_VER_INVENTARIO_TECNICO } from '../../common/constants/roles.constants';

@ApiTags('notificaciones')
@ApiBearerAuth()
@Controller('notificaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Get('mi-lista')
  @Roles(...ROLES_VER_INVENTARIO_TECNICO)
  obtenerMisNotificaciones(
    @Request() req,
    @Query('limit') limit?: string,
    @Query('noLeidas') noLeidas?: string,
  ) {
    return this.notificacionesService.obtenerNotificacionesUsuario(
      req.user.usuarioId,
      limit ? +limit : 50,
      noLeidas === 'true',
    );
  }

  @Get('contar-no-leidas')
  @Roles(...ROLES_VER_INVENTARIO_TECNICO)
  async contarNoLeidas(@Request() req) {
    const count = await this.notificacionesService.contarNoLeidas(req.user.usuarioId);
    return count;
  }

  @Get('contar-mensajes-no-leidos')
  @Roles(...ROLES_VER_INVENTARIO_TECNICO)
  async contarMensajesNoLeidos(@Request() req) {
    const count = await this.notificacionesService.contarMensajesNoLeidos(req.user.usuarioId);
    return count;
  }

  @Post(':notificacionId/marcar-leida')
  @Roles(...ROLES_VER_INVENTARIO_TECNICO)
  marcarComoLeida(@Request() req, @Param('notificacionId') notificacionId: string) {
    return this.notificacionesService.marcarComoLeida(+notificacionId, req.user.usuarioId);
  }

  @Post('marcar-todas-leidas')
  @Roles(...ROLES_VER_INVENTARIO_TECNICO)
  marcarTodasComoLeidas(@Request() req) {
    return this.notificacionesService.marcarTodasComoLeidas(req.user.usuarioId);
  }

  @Delete(':notificacionId')
  @Roles(...ROLES_VER_INVENTARIO_TECNICO)
  eliminarNotificacion(@Request() req, @Param('notificacionId') notificacionId: string) {
    return this.notificacionesService.eliminarNotificacion(+notificacionId, req.user.usuarioId);
  }

  @Post('grupo/:grupoId/marcar-leidas')
  @Roles(...ROLES_VER_INVENTARIO_TECNICO)
  marcarLeidasPorGrupo(@Request() req, @Param('grupoId') grupoId: string) {
    return this.notificacionesService.marcarLeidasPorGrupo(+grupoId, req.user.usuarioId);
  }
}
