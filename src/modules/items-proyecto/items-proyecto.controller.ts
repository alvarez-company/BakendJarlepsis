import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ItemsProyectoService } from './items-proyecto.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  ROLES_ITEMS_PROYECTO_EDITAR,
  ROLES_VER_ITEMS_PROYECTO,
  ROLES_SUPERADMIN_GERENCIA,
} from '../../common/constants/roles.constants';

@ApiTags('items-proyecto')
@ApiBearerAuth()
@Controller('items-proyecto')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ItemsProyectoController {
  constructor(private readonly service: ItemsProyectoService) {}

  @Post()
  @Roles(...ROLES_ITEMS_PROYECTO_EDITAR)
  create(@Body() data: any, @Request() req) {
    return this.service.create(data, req.user.usuarioId);
  }

  @Get()
  @Roles(...ROLES_VER_ITEMS_PROYECTO)
  findAll(@Query('proyectoId') proyectoId?: string) {
    if (proyectoId) {
      return this.service.findByProyecto(+proyectoId);
    }
    return this.service.findAll();
  }

  @Get(':id')
  @Roles(...ROLES_VER_ITEMS_PROYECTO)
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Patch(':id')
  @Roles(...ROLES_ITEMS_PROYECTO_EDITAR)
  update(@Param('id') id: string, @Body() data: any) {
    return this.service.update(+id, data);
  }

  @Delete(':id')
  @Roles(...ROLES_SUPERADMIN_GERENCIA)
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
