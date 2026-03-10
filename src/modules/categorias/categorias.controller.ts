import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CategoriasService } from './categorias.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  ROLES_GESTION_CATEGORIAS,
  ROLES_VER_CATEGORIAS,
  ROLES_SUPERADMIN_GERENCIA,
} from '../../common/constants/roles.constants';

@ApiTags('categorias')
@ApiBearerAuth()
@Controller('categorias')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  @Post()
  @Roles(...ROLES_GESTION_CATEGORIAS)
  @ApiOperation({ summary: 'Create a new categoria' })
  create(@Body() createCategoriaDto: CreateCategoriaDto) {
    return this.categoriasService.create(createCategoriaDto);
  }

  @Get()
  @Roles(...ROLES_VER_CATEGORIAS)
  @ApiOperation({ summary: 'Get all categorias' })
  findAll() {
    return this.categoriasService.findAll();
  }

  @Get(':id')
  @Roles(...ROLES_VER_CATEGORIAS)
  @ApiOperation({ summary: 'Get a categoria by ID' })
  findOne(@Param('id') id: string) {
    return this.categoriasService.findOne(+id);
  }

  @Patch(':id')
  @Roles(...ROLES_GESTION_CATEGORIAS)
  @ApiOperation({ summary: 'Update a categoria' })
  update(@Param('id') id: string, @Body() updateCategoriaDto: UpdateCategoriaDto) {
    return this.categoriasService.update(+id, updateCategoriaDto);
  }

  @Delete(':id')
  @Roles(...ROLES_SUPERADMIN_GERENCIA)
  @ApiOperation({ summary: 'Delete a categoria' })
  remove(@Param('id') id: string) {
    return this.categoriasService.remove(+id);
  }
}
