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
import { ClasificacionesService } from './clasificaciones.service';
import { CreateClasificacionDto } from './dto/create-clasificacion.dto';
import { UpdateClasificacionDto } from './dto/update-clasificacion.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('clasificaciones')
@ApiBearerAuth()
@Controller('clasificaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClasificacionesController {
  constructor(private readonly clasificacionesService: ClasificacionesService) {}

  @Post()
  @Roles('superadmin', 'admin')
  create(@Body() createClasificacionDto: CreateClasificacionDto, @Request() req) {
    return this.clasificacionesService.create(createClasificacionDto, req.user.usuarioId);
  }

  @Get()
  @Roles(
    'superadmin',
    'admin',
    'administrador',
    'almacenista',
    'tecnico',
    'soldador',
    'bodega-internas',
    'bodega-redes',
  )
  findAll() {
    return this.clasificacionesService.findAll();
  }

  @Get(':id')
  @Roles(
    'superadmin',
    'admin',
    'administrador',
    'almacenista',
    'tecnico',
    'soldador',
    'bodega-internas',
    'bodega-redes',
  )
  findOne(@Param('id') id: string) {
    return this.clasificacionesService.findOne(+id);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin')
  update(@Param('id') id: string, @Body() updateClasificacionDto: UpdateClasificacionDto) {
    return this.clasificacionesService.update(+id, updateClasificacionDto);
  }

  @Delete(':id')
  @Roles('superadmin')
  remove(@Param('id') id: string) {
    return this.clasificacionesService.remove(+id);
  }
}
