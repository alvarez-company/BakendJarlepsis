import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditoriaService } from './auditoria.service';
import { TipoEntidad } from './auditoria.entity';
import { ROLES_AUDITORIA_INVENTARIO } from '../../common/constants/roles.constants';
import { MovimientosService } from '../movimientos/movimientos.service';
import { TrasladosService } from '../traslados/traslados.service';
import { AsignacionesTecnicosService } from '../asignaciones-tecnicos/asignaciones-tecnicos.service';
import { InstalacionesService } from '../instalaciones/instalaciones.service';

@ApiTags('auditoria-eliminaciones')
@ApiBearerAuth()
@Controller('auditoria-eliminaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ROLES_AUDITORIA_INVENTARIO)
export class AuditoriaEliminacionesController {
  constructor(
    private readonly auditoriaService: AuditoriaService,
    private readonly movimientosService: MovimientosService,
    private readonly trasladosService: TrasladosService,
    private readonly asignacionesService: AsignacionesTecnicosService,
    private readonly instalacionesService: InstalacionesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar eliminaciones auditadas con filtros' })
  @ApiQuery({ name: 'tipoEntidad', required: false, type: String })
  @ApiQuery({ name: 'entidadId', required: false, type: Number })
  findAll(@Query('tipoEntidad') tipoEntidad?: string, @Query('entidadId') entidadId?: string) {
    return this.auditoriaService.findAll({
      tipoEntidad: tipoEntidad as TipoEntidad,
      entidadId: entidadId ? Number(entidadId) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver detalle de una eliminación auditada' })
  async findOne(@Param('id') id: string) {
    const row = await this.auditoriaService.findOne(Number(id));
    if (!row) throw new NotFoundException(`Auditoría ${id} no encontrada`);
    return row;
  }

  @Post(':id/restablecer')
  @ApiOperation({ summary: 'Restablecer una entidad eliminada desde auditoría' })
  async restablecer(@Param('id') id: string, @Request() req: { user?: any }) {
    const auditId = Number(id);
    if (!Number.isFinite(auditId) || auditId <= 0) {
      throw new BadRequestException('ID de auditoría inválido');
    }
    const row = await this.auditoriaService.findOne(auditId);
    if (!row) throw new NotFoundException(`Auditoría ${id} no encontrada`);

    const usuarioId = Number(req?.user?.usuarioId || 0);
    if (!Number.isFinite(usuarioId) || usuarioId <= 0) {
      throw new BadRequestException('Usuario inválido');
    }

    if (row.tipoEntidad === TipoEntidad.MOVIMIENTO) {
      return this.movimientosService.restablecerDesdeAuditoria(row, usuarioId);
    }
    if (row.tipoEntidad === TipoEntidad.TRASLADO) {
      return this.trasladosService.restablecerDesdeAuditoria(row, usuarioId);
    }
    if (row.tipoEntidad === TipoEntidad.ASIGNACION) {
      return this.asignacionesService.restablecerDesdeAuditoria(row, usuarioId);
    }
    if (row.tipoEntidad === TipoEntidad.INSTALACION) {
      return this.instalacionesService.restablecerDesdeAuditoria(row, usuarioId);
    }

    throw new BadRequestException(
      `Restablecer aún no está implementado para tipoEntidad=${row.tipoEntidad}`,
    );
  }
}

