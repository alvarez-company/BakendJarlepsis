import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProyectosRedesService } from './proyectos-redes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  ROLES_PROYECTOS_EDITAR,
  ROLES_VER_PROYECTOS,
  ROLES_ELIMINAR_PROYECTOS,
} from '../../common/constants/roles.constants';

@ApiTags('proyectos-redes')
@ApiBearerAuth()
@Controller('proyectos-redes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProyectosRedesController {
  constructor(private readonly service: ProyectosRedesService) {}

  @Get()
  @Roles(...ROLES_VER_PROYECTOS)
  listTipos() {
    return this.service.findAllTipos();
  }

  @Get(':proyectoRedesId/actividades')
  @Roles(...ROLES_VER_PROYECTOS)
  listActividades(@Param('proyectoRedesId', ParseIntPipe) proyectoRedesId: number) {
    return this.service.findActividadesByProyectoRedesId(proyectoRedesId);
  }

  @Post(':proyectoRedesId/actividades')
  @Roles(...ROLES_PROYECTOS_EDITAR)
  createActividad(
    @Param('proyectoRedesId', ParseIntPipe) proyectoRedesId: number,
    @Body() body: { nombre: string; orden?: number; activo?: boolean },
    @Request() req: any,
  ) {
    return this.service.createActividad(proyectoRedesId, body, req.user?.usuarioId);
  }

  @Patch('actividades/:actividadId')
  @Roles(...ROLES_PROYECTOS_EDITAR)
  updateActividad(
    @Param('actividadId', ParseIntPipe) actividadId: number,
    @Body() body: { nombre?: string; orden?: number; activo?: boolean },
  ) {
    return this.service.updateActividad(actividadId, body);
  }

  @Delete('actividades/:actividadId')
  @Roles(...ROLES_ELIMINAR_PROYECTOS)
  removeActividad(@Param('actividadId', ParseIntPipe) actividadId: number) {
    return this.service.removeActividad(actividadId);
  }
}
