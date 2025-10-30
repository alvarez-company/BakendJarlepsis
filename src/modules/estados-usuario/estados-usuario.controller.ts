import { Controller, Post, Body, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EstadosUsuarioService } from './estados-usuario.service';
import { EstadoUsuario } from './estado-usuario.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('estados-usuario')
@ApiBearerAuth()
@Controller('estados-usuario')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EstadosUsuarioController {
  constructor(private readonly service: EstadosUsuarioService) {}

  @Post('actualizar')
  @Roles('superadmin', 'admin', 'tecnico', 'empleado')
  actualizarEstado(@Request() req, @Body() body: { estado: string; mensajeEstado?: string }) {
    return this.service.actualizarEstado(req.user.usuarioId, body.estado as any, body.mensajeEstado);
  }

  @Get('mi-estado')
  @Roles('superadmin', 'admin', 'tecnico', 'empleado')
  obtenerMiEstado(@Request() req) {
    return this.service.obtenerEstado(req.user.usuarioId);
  }

  @Get('usuarios-en-linea')
  @Roles('superadmin', 'admin', 'tecnico', 'empleado')
  obtenerUsuariosEnLinea() {
    return this.service.obtenerUsuariosEnLinea();
  }
}

