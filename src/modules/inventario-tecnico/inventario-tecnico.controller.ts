import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InventarioTecnicoService } from './inventario-tecnico.service';
import {
  CreateInventarioTecnicoDto,
  UpdateInventarioTecnicoDto,
  AssignMaterialesToTecnicoDto,
} from './dto/create-inventario-tecnico.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('inventario-tecnico')
@ApiBearerAuth()
@Controller('inventario-tecnico')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventarioTecnicoController {
  constructor(private readonly service: InventarioTecnicoService) {}

  @Post()
  @Roles('superadmin', 'almacenista')
  @ApiOperation({ summary: 'Crear o actualizar inventario de técnico' })
  create(@Body() createDto: CreateInventarioTecnicoDto) {
    return this.service.create(createDto);
  }

  @Post('usuario/:usuarioId/asignar')
  @Roles('superadmin', 'almacenista')
  @ApiOperation({ summary: 'Asignar múltiples materiales a un técnico' })
  asignarMateriales(
    @Param('usuarioId') usuarioId: string,
    @Body() dto: AssignMaterialesToTecnicoDto,
  ) {
    return this.service.asignarMateriales(+usuarioId, dto);
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
  @ApiOperation({ summary: 'Obtener todo el inventario de técnicos' })
  findAll() {
    return this.service.findAll();
  }

  @Get('usuario/:usuarioId')
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
  @ApiOperation({ summary: 'Obtener inventario de un técnico específico' })
  findByUsuario(@Param('usuarioId') usuarioId: string) {
    return this.service.findByUsuario(+usuarioId);
  }

  @Get('material/:materialId')
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
  @ApiOperation({ summary: 'Obtener técnicos que tienen un material específico' })
  findByMaterial(@Param('materialId') materialId: string) {
    return this.service.findByMaterial(+materialId);
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
  @ApiOperation({ summary: 'Obtener un registro de inventario técnico por ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Put(':id')
  @Roles('superadmin', 'almacenista')
  @ApiOperation({ summary: 'Actualizar inventario técnico' })
  update(@Param('id') id: string, @Body() updateDto: UpdateInventarioTecnicoDto) {
    return this.service.update(+id, updateDto);
  }

  @Delete(':id')
  @Roles('superadmin', 'almacenista')
  @ApiOperation({ summary: 'Eliminar registro de inventario técnico' })
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }

  @Delete('usuario/:usuarioId/material/:materialId')
  @Roles('superadmin', 'almacenista')
  @ApiOperation({ summary: 'Eliminar material del inventario de un técnico' })
  removeByUsuarioAndMaterial(
    @Param('usuarioId') usuarioId: string,
    @Param('materialId') materialId: string,
  ) {
    return this.service.removeByUsuarioAndMaterial(+usuarioId, +materialId);
  }
}
