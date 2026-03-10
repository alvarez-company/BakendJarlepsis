import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MunicipiosService } from './municipios.service';
import { CreateMunicipioDto } from './dto/create-municipio.dto';
import { UpdateMunicipioDto } from './dto/update-municipio.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  ROLES_GESTION_MUNICIPIOS,
  ROLES_VER_CATEGORIAS,
  ROLES_SUPERADMIN_GERENCIA,
} from '../../common/constants/roles.constants';

@ApiTags('municipios')
@ApiBearerAuth()
@Controller('municipios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MunicipiosController {
  constructor(private readonly municipiosService: MunicipiosService) {}

  @Post()
  @Roles(...ROLES_GESTION_MUNICIPIOS)
  @ApiOperation({ summary: 'Create a new municipio' })
  create(@Body() createMunicipioDto: CreateMunicipioDto) {
    return this.municipiosService.create(createMunicipioDto);
  }

  @Get()
  @Roles(...ROLES_VER_CATEGORIAS)
  @ApiOperation({ summary: 'Get all municipios' })
  findAll() {
    return this.municipiosService.findAll();
  }

  @Get(':id')
  @Roles(...ROLES_VER_CATEGORIAS)
  @ApiOperation({ summary: 'Get a municipio by ID' })
  findOne(@Param('id') id: string) {
    return this.municipiosService.findOne(+id);
  }

  @Patch(':id')
  @Roles(...ROLES_GESTION_MUNICIPIOS)
  @ApiOperation({ summary: 'Update a municipio' })
  update(@Param('id') id: string, @Body() updateMunicipioDto: UpdateMunicipioDto) {
    return this.municipiosService.update(+id, updateMunicipioDto);
  }

  @Delete(':id')
  @Roles(...ROLES_SUPERADMIN_GERENCIA)
  @ApiOperation({ summary: 'Delete a municipio' })
  remove(@Param('id') id: string) {
    return this.municipiosService.remove(+id);
  }
}
