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
import { TiposInstalacionService } from './tipos-instalacion.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  ROLES_TIPOS_INSTALACION,
  ROLES_VER_INVENTARIO_TECNICO,
  ROLES_ELIMINAR_INSTALACIONES,
  ROLES_INSTALACIONES,
} from '../../common/constants/roles.constants';

@ApiTags('tipos-instalacion')
@ApiBearerAuth()
@Controller('tipos-instalacion')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TiposInstalacionController {
  constructor(private readonly service: TiposInstalacionService) {}

  @Post()
  @Roles(...ROLES_TIPOS_INSTALACION)
  create(@Body() data: any, @Request() req) {
    return this.service.create(data, req.user.usuarioId);
  }

  @Get()
  @Roles(...ROLES_VER_INVENTARIO_TECNICO)
  findAll(@Request() req) {
    return this.service.findAll(req.user);
  }

  @Get(':id')
  @Roles(...ROLES_INSTALACIONES)
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Patch(':id')
  @Roles(...ROLES_TIPOS_INSTALACION)
  update(@Param('id') id: string, @Body() data: any) {
    return this.service.update(+id, data);
  }

  @Delete(':id')
  @Roles(...ROLES_ELIMINAR_INSTALACIONES)
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
