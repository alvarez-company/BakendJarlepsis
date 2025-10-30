import { Controller, Post, Get, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MensajesService } from './mensajes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('mensajes')
@ApiBearerAuth()
@Controller('mensajes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MensajesController {
  constructor(private readonly service: MensajesService) {}

  @Post('enviar')
  @Roles('superadmin', 'admin', 'tecnico', 'empleado')
  enviarMensaje(@Request() req, @Body() body: { grupoId: number; texto: string; mensajeRespuestaId?: number }) {
    return this.service.enviarMensaje(body.grupoId, req.user.usuarioId, body.texto, body.mensajeRespuestaId);
  }

  @Get('grupo/:grupoId')
  @Roles('superadmin', 'admin', 'tecnico', 'empleado')
  obtenerMensajes(@Param('grupoId') grupoId: string, @Query('limit') limit?: string) {
    return this.service.obtenerMensajesGrupo(+grupoId, limit ? +limit : 50);
  }

  @Post(':mensajeId/editar')
  @Roles('superadmin', 'admin', 'tecnico', 'empleado')
  editarMensaje(@Request() req, @Param('mensajeId') mensajeId: string, @Body() body: { texto: string }) {
    return this.service.editarMensaje(+mensajeId, body.texto, req.user.usuarioId);
  }

  @Post(':mensajeId/eliminar')
  @Roles('superadmin', 'admin', 'tecnico', 'empleado')
  eliminarMensaje(@Request() req, @Param('mensajeId') mensajeId: string) {
    return this.service.eliminarMensaje(+mensajeId, req.user.usuarioId);
  }
}

