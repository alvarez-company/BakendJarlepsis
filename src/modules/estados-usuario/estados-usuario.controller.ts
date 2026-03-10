import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EstadosUsuarioService } from './estados-usuario.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES_VER_INVENTARIO_TECNICO } from '../../common/constants/roles.constants';

@ApiTags('estados-usuario')
@ApiBearerAuth()
@Controller('estados-usuario')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EstadosUsuarioController {
  constructor(private readonly service: EstadosUsuarioService) {}

  @Post('actualizar')
  @Roles(...ROLES_VER_INVENTARIO_TECNICO)
  actualizarEstado(@Request() req, @Body() body: { estado: string; mensajeEstado?: string }) {
    return this.service.actualizarEstado(
      req.user.usuarioId,
      body.estado as any,
      body.mensajeEstado,
    );
  }

  @Get('mi-estado')
  @Roles(...ROLES_VER_INVENTARIO_TECNICO)
  obtenerMiEstado(@Request() req) {
    return this.service.obtenerEstado(req.user.usuarioId);
  }

  @Get('usuarios-en-linea')
  @Roles(...ROLES_VER_INVENTARIO_TECNICO)
  obtenerUsuariosEnLinea() {
    return this.service.obtenerUsuariosEnLinea();
  }
}
