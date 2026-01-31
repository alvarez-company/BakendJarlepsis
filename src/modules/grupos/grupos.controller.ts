import { Controller, Get, Post, UseGuards, Request, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GruposService } from './grupos.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('grupos')
@ApiBearerAuth()
@Controller('grupos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GruposController {
  constructor(private readonly service: GruposService) {}

  @Get('general')
  @Roles(
    'superadmin',
    'admin',
    'almacenista',
    'tecnico',
    'soldador',
    'bodega-internas',
    'bodega-redes',
  )
  obtenerGrupoGeneral() {
    return this.service.obtenerGrupoGeneral();
  }

  @Get('mis-grupos')
  @Roles(
    'superadmin',
    'admin',
    'almacenista',
    'tecnico',
    'soldador',
    'bodega-internas',
    'bodega-redes',
  )
  obtenerMisGrupos(@Request() req) {
    return this.service.obtenerMisGruposConInfo(req.user.usuarioId);
  }

  @Get('entidad/:tipoGrupo/:entidadId')
  @Roles(
    'superadmin',
    'admin',
    'almacenista',
    'tecnico',
    'soldador',
    'bodega-internas',
    'bodega-redes',
  )
  obtenerGrupoPorEntidad(
    @Request() req,
    @Param('tipoGrupo') tipoGrupo: string,
    @Param('entidadId') entidadId: string,
  ) {
    return this.service.obtenerGrupoPorEntidad(tipoGrupo as any, +entidadId);
  }

  @Get('directo/:usuarioId')
  @Roles(
    'superadmin',
    'admin',
    'almacenista',
    'tecnico',
    'soldador',
    'bodega-internas',
    'bodega-redes',
  )
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
  @Roles(
    'superadmin',
    'admin',
    'almacenista',
    'tecnico',
    'soldador',
    'bodega-internas',
    'bodega-redes',
  )
  obtenerGrupoPorId(@Param('grupoId') grupoId: string) {
    return this.service.obtenerGrupoPorId(+grupoId);
  }

  @Post('sincronizar')
  @Roles('superadmin', 'gerencia')
  @ApiOperation({ summary: 'Sincronizar usuarios con grupos existentes' })
  sincronizarGruposYUsuarios() {
    return this.service.sincronizarGruposYUsuarios();
  }
}
