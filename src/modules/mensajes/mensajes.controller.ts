import { Controller, Post, Get, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MensajesService } from './mensajes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES_CHAT } from '../../common/constants/roles.constants';

@ApiTags('mensajes')
@ApiBearerAuth()
@Controller('mensajes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MensajesController {
  constructor(private readonly service: MensajesService) {}

  @Post('enviar')
  @Roles(...ROLES_CHAT)
  enviarMensaje(
    @Request() req,
    @Body()
    body: {
      grupoId: number;
      texto: string;
      mensajeRespuestaId?: number;
      archivosAdjuntos?: string[] | { url: string }[];
    },
  ) {
    return this.service.enviarMensaje(
      body.grupoId,
      req.user.usuarioId,
      body.texto,
      body.mensajeRespuestaId,
      body.archivosAdjuntos,
    );
  }

  @Get('grupo/:grupoId')
  @Roles(...ROLES_CHAT)
  obtenerMensajes(
    @Param('grupoId') grupoId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.service.obtenerMensajesGrupo(+grupoId, limit ? +limit : 50, offset ? +offset : 0);
  }

  @Post(':mensajeId/editar')
  @Roles(...ROLES_CHAT)
  editarMensaje(
    @Request() req,
    @Param('mensajeId') mensajeId: string,
    @Body() body: { texto: string },
  ) {
    return this.service.editarMensaje(+mensajeId, body.texto, req.user.usuarioId);
  }

  @Post(':mensajeId/eliminar')
  @Roles(...ROLES_CHAT)
  eliminarMensaje(@Request() req, @Param('mensajeId') mensajeId: string) {
    return this.service.eliminarMensaje(+mensajeId, req.user.usuarioId);
  }
}
