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

@ApiTags('tipos-instalacion')
@ApiBearerAuth()
@Controller('tipos-instalacion')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TiposInstalacionController {
  constructor(private readonly service: TiposInstalacionService) {}

  @Post()
  @Roles('superadmin', 'admin', 'admin-internas', 'admin-redes', 'bodega-internas', 'bodega-redes')
  create(@Body() data: any, @Request() req) {
    return this.service.create(data, req.user.usuarioId);
  }

  @Get()
  @Roles(
    'superadmin',
    'admin',
    'administrador',
    'admin-internas',
    'admin-redes',
    'almacenista',
    'tecnico',
    'soldador',
    'bodega-internas',
    'bodega-redes',
  )
  findAll(@Request() req) {
    return this.service.findAll(req.user);
  }

  @Get(':id')
  @Roles(
    'superadmin',
    'admin',
    'administrador',
    'admin-internas',
    'admin-redes',
    'almacenista',
    'tecnico',
    'soldador',
    'bodega-internas',
    'bodega-redes',
  )
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin', 'admin-internas', 'admin-redes', 'bodega-internas', 'bodega-redes')
  update(@Param('id') id: string, @Body() data: any) {
    return this.service.update(+id, data);
  }

  @Delete(':id')
  @Roles('superadmin', 'bodega-internas', 'bodega-redes')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
