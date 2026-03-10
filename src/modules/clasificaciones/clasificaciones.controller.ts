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
import {
  ROLES_GESTION_CATEGORIAS,
  ROLES_VER_CATEGORIAS,
  ROLES_SUPERADMIN_GERENCIA,
} from '../../common/constants/roles.constants';

@ApiTags('clasificaciones')
@ApiBearerAuth()
@Controller('clasificaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClasificacionesController {
  constructor(private readonly clasificacionesService: ClasificacionesService) {}

  @Post()
  @Roles(...ROLES_GESTION_CATEGORIAS)
  create(@Body() createClasificacionDto: CreateClasificacionDto, @Request() req) {
    return this.clasificacionesService.create(createClasificacionDto, req.user.usuarioId);
  }

  @Get()
  @Roles(...ROLES_VER_CATEGORIAS)
  findAll() {
    return this.clasificacionesService.findAll();
  }

  @Get(':id')
  @Roles(...ROLES_VER_CATEGORIAS)
  findOne(@Param('id') id: string) {
    return this.clasificacionesService.findOne(+id);
  }

  @Patch(':id')
  @Roles(...ROLES_GESTION_CATEGORIAS)
  update(@Param('id') id: string, @Body() updateClasificacionDto: UpdateClasificacionDto) {
    return this.clasificacionesService.update(+id, updateClasificacionDto);
  }

  @Delete(':id')
  @Roles(...ROLES_SUPERADMIN_GERENCIA)
  remove(@Param('id') id: string) {
    return this.clasificacionesService.remove(+id);
  }
}
