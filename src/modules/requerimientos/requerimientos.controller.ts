import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { RequerimientosService } from './requerimientos.service';
import { CreateRequerimientoDto } from './dto/create-requerimiento.dto';
import { UpdateRequerimientoDto } from './dto/update-requerimiento.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ImpersonationGuard } from '../auth/guards/impersonation.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  ROLES_REQUERIMIENTOS,
  ROLES_REQUERIMIENTOS_ADMIN,
  ROLES_SUPERADMIN_GERENCIA,
} from '../../common/constants/roles.constants';
import {
  TipoRequerimiento,
  EstadoRequerimiento,
  PrioridadRequerimiento,
  CategoriaRequerimiento,
} from './requerimiento.entity';

@ApiTags('requerimientos')
@ApiBearerAuth()
@Controller('requerimientos')
@UseGuards(JwtAuthGuard, ImpersonationGuard, RolesGuard)
export class RequerimientosController {
  constructor(private readonly requerimientosService: RequerimientosService) {}

  @Post()
  @Roles(...ROLES_REQUERIMIENTOS)
  @ApiOperation({ summary: 'Crear un nuevo requerimiento' })
  create(@Body() createDto: CreateRequerimientoDto, @Request() req) {
    return this.requerimientosService.create(createDto, {
      usuarioId: req.user.usuarioId,
      rolNombre: req.user.rol?.rolNombre || req.user.rolNombre,
      sedeId: req.user.sedeId,
    });
  }

  @Get()
  @Roles(...ROLES_REQUERIMIENTOS)
  @ApiOperation({ summary: 'Listar requerimientos con filtros' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'tipo', required: false, enum: TipoRequerimiento })
  @ApiQuery({ name: 'estado', required: false, enum: EstadoRequerimiento })
  @ApiQuery({ name: 'prioridad', required: false, enum: PrioridadRequerimiento })
  @ApiQuery({ name: 'categoria', required: false, enum: CategoriaRequerimiento })
  @ApiQuery({ name: 'solicitanteId', required: false, type: Number })
  @ApiQuery({ name: 'asignadoId', required: false, type: Number })
  @ApiQuery({ name: 'sedeId', required: false, type: Number })
  @ApiQuery({ name: 'busqueda', required: false, type: String })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('tipo') tipo?: TipoRequerimiento,
    @Query('estado') estado?: EstadoRequerimiento,
    @Query('prioridad') prioridad?: PrioridadRequerimiento,
    @Query('categoria') categoria?: CategoriaRequerimiento,
    @Query('solicitanteId') solicitanteId?: string,
    @Query('asignadoId') asignadoId?: string,
    @Query('sedeId') sedeId?: string,
    @Query('busqueda') busqueda?: string,
    @Request() req?,
  ) {
    return this.requerimientosService.findAll(
      {
        page: page ? +page : undefined,
        limit: limit ? +limit : undefined,
        tipo,
        estado,
        prioridad,
        categoria,
        solicitanteId: solicitanteId ? +solicitanteId : undefined,
        asignadoId: asignadoId ? +asignadoId : undefined,
        sedeId: sedeId ? +sedeId : undefined,
        busqueda,
      },
      {
        usuarioId: req.user.usuarioId,
        rolNombre: req.user.rol?.rolNombre || req.user.rolNombre,
        sedeId: req.user.sedeId,
      },
    );
  }

  @Get('mis-requerimientos')
  @Roles(...ROLES_REQUERIMIENTOS)
  @ApiOperation({ summary: 'Obtener requerimientos creados por el usuario actual' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'estado', required: false, enum: EstadoRequerimiento })
  getMisRequerimientos(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('estado') estado?: EstadoRequerimiento,
    @Request() req?,
  ) {
    return this.requerimientosService.getMisRequerimientos(
      {
        usuarioId: req.user.usuarioId,
        rolNombre: req.user.rol?.rolNombre || req.user.rolNombre,
        sedeId: req.user.sedeId,
      },
      {
        page: page ? +page : undefined,
        limit: limit ? +limit : undefined,
        estado,
      },
    );
  }

  @Get('asignados')
  @Roles(...ROLES_REQUERIMIENTOS_ADMIN)
  @ApiOperation({ summary: 'Obtener requerimientos asignados al usuario actual' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'estado', required: false, enum: EstadoRequerimiento })
  getAsignadosAMi(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('estado') estado?: EstadoRequerimiento,
    @Request() req?,
  ) {
    return this.requerimientosService.getAsignadosAMi(
      {
        usuarioId: req.user.usuarioId,
        rolNombre: req.user.rol?.rolNombre || req.user.rolNombre,
        sedeId: req.user.sedeId,
      },
      {
        page: page ? +page : undefined,
        limit: limit ? +limit : undefined,
        estado,
      },
    );
  }

  @Get('estadisticas')
  @Roles(...ROLES_REQUERIMIENTOS_ADMIN)
  @ApiOperation({ summary: 'Obtener estadísticas de requerimientos' })
  getEstadisticas(@Request() req) {
    return this.requerimientosService.getEstadisticas({
      usuarioId: req.user.usuarioId,
      rolNombre: req.user.rol?.rolNombre || req.user.rolNombre,
      sedeId: req.user.sedeId,
    });
  }

  @Get('codigo/:codigo')
  @Roles(...ROLES_REQUERIMIENTOS)
  @ApiOperation({ summary: 'Buscar requerimiento por código' })
  findByCodigo(@Param('codigo') codigo: string, @Request() req) {
    return this.requerimientosService.findByCodigo(codigo, {
      usuarioId: req.user.usuarioId,
      rolNombre: req.user.rol?.rolNombre || req.user.rolNombre,
      sedeId: req.user.sedeId,
    });
  }

  @Get(':id')
  @Roles(...ROLES_REQUERIMIENTOS)
  @ApiOperation({ summary: 'Obtener un requerimiento por ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.requerimientosService.findOne(id, {
      usuarioId: req.user.usuarioId,
      rolNombre: req.user.rol?.rolNombre || req.user.rolNombre,
      sedeId: req.user.sedeId,
    });
  }

  @Put(':id')
  @Roles(...ROLES_REQUERIMIENTOS)
  @ApiOperation({ summary: 'Actualizar un requerimiento' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateRequerimientoDto,
    @Request() req,
  ) {
    return this.requerimientosService.update(id, updateDto, {
      usuarioId: req.user.usuarioId,
      rolNombre: req.user.rol?.rolNombre || req.user.rolNombre,
      sedeId: req.user.sedeId,
    });
  }

  @Put(':id/estado')
  @Roles(...ROLES_REQUERIMIENTOS_ADMIN)
  @ApiOperation({ summary: 'Cambiar el estado de un requerimiento' })
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { estado: EstadoRequerimiento; respuesta?: string; publicarCambio?: boolean },
    @Request() req,
  ) {
    return this.requerimientosService.cambiarEstado(
      id,
      body.estado,
      {
        usuarioId: req.user.usuarioId,
        rolNombre: req.user.rol?.rolNombre || req.user.rolNombre,
        sedeId: req.user.sedeId,
      },
      body.respuesta,
      body.publicarCambio,
    );
  }

  @Put(':id/asignar')
  @Roles(...ROLES_REQUERIMIENTOS_ADMIN)
  @ApiOperation({ summary: 'Asignar un requerimiento a un usuario' })
  asignar(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { asignadoId: number },
    @Request() req,
  ) {
    return this.requerimientosService.asignar(id, body.asignadoId, {
      usuarioId: req.user.usuarioId,
      rolNombre: req.user.rol?.rolNombre || req.user.rolNombre,
      sedeId: req.user.sedeId,
    });
  }

  @Delete(':id')
  @Roles(...ROLES_REQUERIMIENTOS)
  @ApiOperation({ summary: 'Eliminar un requerimiento' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.requerimientosService.remove(id, {
      usuarioId: req.user.usuarioId,
      rolNombre: req.user.rol?.rolNombre || req.user.rolNombre,
      sedeId: req.user.sedeId,
    });
  }
}
