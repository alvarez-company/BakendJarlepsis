import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProyectosService } from './proyectos.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  ROLES_PROYECTOS_EDITAR,
  ROLES_VER_PROYECTOS,
  ROLES_ELIMINAR_PROYECTOS,
} from '../../common/constants/roles.constants';

@ApiTags('proyectos')
@ApiBearerAuth()
@Controller('proyectos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProyectosController {
  constructor(private readonly service: ProyectosService) {}

  @Post()
  @Roles(...ROLES_PROYECTOS_EDITAR)
  create(@Body() data: any, @Request() req) {
    return this.service.create(data, req.user.usuarioId);
  }

  @Get()
  @Roles(...ROLES_VER_PROYECTOS)
  findAll(@Request() req) {
    return this.service.findAll(req.user);
  }

  @Get(':id')
  @Roles(...ROLES_VER_PROYECTOS)
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Patch(':id')
  @Roles(...ROLES_PROYECTOS_EDITAR)
  update(@Param('id') id: string, @Body() data: any) {
    return this.service.update(+id, data);
  }

  @Delete(':id')
  @Roles(...ROLES_ELIMINAR_PROYECTOS)
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
