import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TiposProyectoService } from './tipos-proyecto.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  ROLES_TIPOS_PROYECTO_EDITAR,
  ROLES_VER_ITEMS_PROYECTO,
  ROLES_SUPERADMIN_GERENCIA,
} from '../../common/constants/roles.constants';

@ApiTags('tipos-proyecto')
@ApiBearerAuth()
@Controller('tipos-proyecto')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TiposProyectoController {
  constructor(private readonly service: TiposProyectoService) {}

  @Post()
  @Roles(...ROLES_TIPOS_PROYECTO_EDITAR)
  create(@Body() data: any) {
    return this.service.create(data);
  }

  @Get()
  @Roles(...ROLES_VER_ITEMS_PROYECTO)
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles(...ROLES_VER_ITEMS_PROYECTO)
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Patch(':id')
  @Roles(...ROLES_TIPOS_PROYECTO_EDITAR)
  update(@Param('id') id: string, @Body() data: any) {
    return this.service.update(+id, data);
  }

  @Delete(':id')
  @Roles(...ROLES_SUPERADMIN_GERENCIA)
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
