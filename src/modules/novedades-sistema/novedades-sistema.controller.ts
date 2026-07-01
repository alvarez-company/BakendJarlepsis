import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { NovedadesSistemaService } from './novedades-sistema.service';
import { CreateNovedadSistemaDto } from './dto/create-novedad-sistema.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES_SUPERADMIN_GERENCIA, ROLES_REQUERIMIENTOS } from '../../common/constants/roles.constants';

@ApiTags('novedades-sistema')
@ApiBearerAuth()
@Controller('novedades-sistema')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NovedadesSistemaController {
  constructor(private readonly novedadesService: NovedadesSistemaService) {}

  @Post()
  @Roles(...ROLES_SUPERADMIN_GERENCIA)
  @ApiOperation({ summary: 'Crear una nueva novedad del sistema' })
  create(@Body() createDto: CreateNovedadSistemaDto, @Request() req) {
    return this.novedadesService.create(createDto, req.user.usuarioId);
  }

  @Get()
  @Roles(...ROLES_REQUERIMIENTOS)
  @ApiOperation({ summary: 'Listar novedades del sistema' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'soloDestacadas', required: false, type: Boolean })
  findAll(
    @Query('limit') limit?: string,
    @Query('soloDestacadas') soloDestacadas?: string,
  ) {
    return this.novedadesService.findAll({
      limit: limit ? +limit : undefined,
      soloDestacadas: soloDestacadas === 'true',
    });
  }

  @Get('recientes')
  @Roles(...ROLES_REQUERIMIENTOS)
  @ApiOperation({ summary: 'Obtener novedades recientes' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findRecientes(@Query('limit') limit?: string) {
    return this.novedadesService.findRecientes(limit ? +limit : 10);
  }

  @Get('no-vistas')
  @Roles(...ROLES_REQUERIMIENTOS)
  @ApiOperation({ summary: 'Obtener novedades no vistas desde una fecha' })
  @ApiQuery({ name: 'desde', required: true, type: String, description: 'Fecha ISO' })
  findNoVistas(@Query('desde') desde: string) {
    const fecha = new Date(desde);
    return this.novedadesService.findNoVistas(fecha);
  }

  @Get('contar-no-vistas')
  @Roles(...ROLES_REQUERIMIENTOS)
  @ApiOperation({ summary: 'Contar novedades no vistas' })
  @ApiQuery({ name: 'desde', required: true, type: String, description: 'Fecha ISO' })
  contarNoVistas(@Query('desde') desde: string) {
    const fecha = new Date(desde);
    return this.novedadesService.contarNoVistas(fecha);
  }

  @Get(':id')
  @Roles(...ROLES_REQUERIMIENTOS)
  @ApiOperation({ summary: 'Obtener una novedad por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.novedadesService.findOne(id);
  }

  @Delete(':id')
  @Roles(...ROLES_SUPERADMIN_GERENCIA)
  @ApiOperation({ summary: 'Desactivar una novedad' })
  desactivar(@Param('id', ParseIntPipe) id: number) {
    return this.novedadesService.desactivar(id);
  }
}
