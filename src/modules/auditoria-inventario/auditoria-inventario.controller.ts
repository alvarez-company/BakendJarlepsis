import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuditoriaInventarioService } from './auditoria-inventario.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('auditoria-inventario')
@ApiBearerAuth()
@Controller('auditoria-inventario')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditoriaInventarioController {
  constructor(
    private readonly auditoriaService: AuditoriaInventarioService,
  ) {}

  @Get('material/:materialId')
  @Roles('superadmin', 'admin', 'administrador', 'almacenista')
  @ApiOperation({ summary: 'Obtener histórico de cambios de un material' })
  findByMaterial(@Param('materialId') materialId: string) {
    return this.auditoriaService.findByMaterial(+materialId);
  }

  @Get('usuario/:usuarioId')
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Obtener histórico de cambios por usuario' })
  findByUsuario(@Param('usuarioId') usuarioId: string) {
    return this.auditoriaService.findByUsuario(+usuarioId);
  }

  @Get()
  @Roles('superadmin', 'admin', 'administrador', 'almacenista')
  @ApiOperation({ summary: 'Obtener todos los cambios de auditoría con filtros' })
  @ApiQuery({ name: 'materialId', required: false, type: Number })
  @ApiQuery({ name: 'usuarioId', required: false, type: Number })
  @ApiQuery({ name: 'tipoCambio', required: false, type: String })
  @ApiQuery({ name: 'fechaDesde', required: false, type: String })
  @ApiQuery({ name: 'fechaHasta', required: false, type: String })
  findAll(
    @Query('materialId') materialId?: string,
    @Query('usuarioId') usuarioId?: string,
    @Query('tipoCambio') tipoCambio?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.auditoriaService.findAll({
      materialId: materialId ? +materialId : undefined,
      usuarioId: usuarioId ? +usuarioId : undefined,
      tipoCambio: tipoCambio as any,
      fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
    });
  }
}

