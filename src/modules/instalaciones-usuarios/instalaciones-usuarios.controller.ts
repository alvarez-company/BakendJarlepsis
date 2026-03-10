import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InstalacionesUsuariosService } from './instalaciones-usuarios.service';
import { AssignUsuariosToInstalacionDto } from './dto/assign-usuarios-to-instalacion.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  ROLES_ASIGNAR_INSTALACIONES,
  ROLES_INSTALACIONES,
  ROLES_GESTION_BODEGAS,
} from '../../common/constants/roles.constants';

@ApiTags('instalaciones-usuarios')
@ApiBearerAuth()
@Controller('instalaciones-usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InstalacionesUsuariosController {
  constructor(private readonly service: InstalacionesUsuariosService) {}

  @Post(':instalacionId/asignar')
  @Roles(...ROLES_ASIGNAR_INSTALACIONES)
  @ApiOperation({ summary: 'Asignar múltiples usuarios a una instalación' })
  asignarUsuarios(
    @Param('instalacionId') instalacionId: string,
    @Body() dto: AssignUsuariosToInstalacionDto,
  ) {
    return this.service.asignarUsuarios(+instalacionId, dto.usuarios);
  }

  @Get('instalacion/:instalacionId')
  @Roles(...ROLES_INSTALACIONES)
  @ApiOperation({ summary: 'Obtener usuarios asignados a una instalación' })
  findByInstalacion(@Param('instalacionId') instalacionId: string) {
    return this.service.findByInstalacion(+instalacionId);
  }

  @Get('usuario/:usuarioId')
  @Roles(...ROLES_INSTALACIONES)
  @ApiOperation({ summary: 'Obtener instalaciones asignadas a un usuario' })
  findByUsuario(@Param('usuarioId') usuarioId: string) {
    return this.service.findByUsuario(+usuarioId);
  }

  @Delete(':id')
  @Roles(...ROLES_ASIGNAR_INSTALACIONES)
  @ApiOperation({ summary: 'Desasignar usuario de instalación' })
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }

  @Delete('instalacion/:instalacionId')
  @Roles(...ROLES_GESTION_BODEGAS)
  @ApiOperation({ summary: 'Desasignar todos los usuarios de una instalación' })
  desasignarTodos(@Param('instalacionId') instalacionId: string) {
    return this.service.desasignarUsuarios(+instalacionId);
  }
}
