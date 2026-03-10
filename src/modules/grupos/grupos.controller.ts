import { Controller, Get, Post, UseGuards, Request, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GruposService } from './grupos.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  ROLES_CHAT,
  ROLES_VER_INVENTARIO_TECNICO,
  ROLES_SINCRONIZAR_GRUPOS,
} from '../../common/constants/roles.constants';

@ApiTags('grupos')
@ApiBearerAuth()
@Controller('grupos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GruposController {
  constructor(private readonly service: GruposService) {}

  @Get('general')
  @Roles(...ROLES_CHAT)
  obtenerGrupoGeneral() {
    return this.service.obtenerGrupoGeneral();
  }

  @Get('mis-grupos')
  @Roles(...ROLES_CHAT)
  obtenerMisGrupos(@Request() req) {
    return this.service.obtenerMisGruposConInfo(req.user.usuarioId);
  }

  @Get('entidad/:tipoGrupo/:entidadId')
  @Roles(...ROLES_VER_INVENTARIO_TECNICO)
  obtenerGrupoPorEntidad(
    @Request() req,
    @Param('tipoGrupo') tipoGrupo: string,
    @Param('entidadId') entidadId: string,
  ) {
    return this.service.obtenerGrupoPorEntidad(tipoGrupo as any, +entidadId);
  }

  @Get('directo/:usuarioId')
  @Roles(...ROLES_CHAT)
  @ApiOperation({ summary: 'Obtener o crear chat directo con un usuario' })
  async obtenerOCrearChatDirecto(@Request() req, @Param('usuarioId') usuarioId: string) {
    try {
      const resultado = await this.service.obtenerOCrearChatDirecto(req.user.usuarioId, +usuarioId);
      return resultado;
    } catch (error) {
      console.error(`[GruposController] Error en obtenerOCrearChatDirecto:`, error);
      console.error(`[GruposController] Stack trace:`, error.stack);
      throw error;
    }
  }

  @Get(':grupoId')
  @Roles(...ROLES_CHAT)
  obtenerGrupoPorId(@Param('grupoId') grupoId: string) {
    return this.service.obtenerGrupoPorId(+grupoId);
  }

  @Post('sincronizar')
  @Roles(...ROLES_SINCRONIZAR_GRUPOS)
  @ApiOperation({ summary: 'Sincronizar usuarios con grupos existentes' })
  sincronizarGruposYUsuarios() {
    return this.service.sincronizarGruposYUsuarios();
  }
}
