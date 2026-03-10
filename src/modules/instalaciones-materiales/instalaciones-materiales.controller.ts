import { Controller, Get, Post, Body, Param, Delete, Put, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InstalacionesMaterialesService } from './instalaciones-materiales.service';
import {
  CreateInstalacionMaterialDto,
  UpdateInstalacionMaterialDto,
  AssignMaterialesToInstalacionDto,
} from './dto/create-instalacion-material.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  ROLES_INSTALACIONES_MATERIALES,
  ROLES_VER_INVENTARIO_TECNICO,
  ROLES_VER_CATALOGOS_ADMIN,
  ROLES_APROBAR_ASIGNACIONES,
} from '../../common/constants/roles.constants';

@ApiTags('instalaciones-materiales')
@ApiBearerAuth()
@Controller('instalaciones-materiales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InstalacionesMaterialesController {
  constructor(private readonly service: InstalacionesMaterialesService) {}

  @Post()
  @Roles(...ROLES_INSTALACIONES_MATERIALES)
  @ApiOperation({ summary: 'Crear registro de material utilizado en instalación' })
  create(@Body() createDto: CreateInstalacionMaterialDto) {
    return this.service.create(createDto);
  }

  @Post('instalacion/:instalacionId/asignar')
  @Roles(...ROLES_INSTALACIONES_MATERIALES)
  @ApiOperation({ summary: 'Asignar múltiples materiales a una instalación' })
  asignarMateriales(
    @Param('instalacionId') instalacionId: string,
    @Body() dto: AssignMaterialesToInstalacionDto,
  ) {
    return this.service.asignarMateriales(+instalacionId, dto);
  }

  @Get()
  @Roles(...ROLES_VER_INVENTARIO_TECNICO)
  @ApiOperation({ summary: 'Obtener todos los materiales utilizados en instalaciones' })
  findAll() {
    return this.service.findAll();
  }

  @Get('instalacion/:instalacionId')
  @Roles(...ROLES_VER_INVENTARIO_TECNICO)
  @ApiOperation({ summary: 'Obtener materiales utilizados en una instalación específica' })
  findByInstalacion(@Param('instalacionId') instalacionId: string) {
    return this.service.findByInstalacion(+instalacionId);
  }

  @Get('material/:materialId')
  @Roles(...ROLES_VER_INVENTARIO_TECNICO)
  @ApiOperation({ summary: 'Obtener instalaciones que utilizaron un material específico' })
  findByMaterial(@Param('materialId') materialId: string) {
    return this.service.findByMaterial(+materialId);
  }

  @Get(':id')
  @Roles(...ROLES_VER_INVENTARIO_TECNICO)
  @ApiOperation({ summary: 'Obtener un registro de material de instalación por ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Put(':id')
  @Roles(...ROLES_INSTALACIONES_MATERIALES)
  @ApiOperation({ summary: 'Actualizar material de instalación' })
  update(@Param('id') id: string, @Body() updateDto: UpdateInstalacionMaterialDto) {
    return this.service.update(+id, updateDto);
  }

  @Patch(':id')
  @Roles(...ROLES_INSTALACIONES_MATERIALES)
  @ApiOperation({ summary: 'Actualizar parcialmente material de instalación' })
  patch(@Param('id') id: string, @Body() updateDto: UpdateInstalacionMaterialDto) {
    return this.service.update(+id, updateDto);
  }

  @Delete(':id')
  @Roles(...ROLES_VER_CATALOGOS_ADMIN)
  @ApiOperation({ summary: 'Eliminar registro de material de instalación' })
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }

  @Delete('instalacion/:instalacionId')
  @Roles(...ROLES_VER_CATALOGOS_ADMIN)
  @ApiOperation({ summary: 'Eliminar todos los materiales de una instalación' })
  removeByInstalacion(@Param('instalacionId') instalacionId: string) {
    return this.service.removeByInstalacion(+instalacionId);
  }

  @Post(':id/aprobar')
  @Roles(...ROLES_APROBAR_ASIGNACIONES)
  @ApiOperation({ summary: 'Aprobar o desaprobar un material utilizado' })
  aprobarMaterial(@Param('id') id: string, @Body() body: { aprobado: boolean }) {
    return this.service.aprobarMaterial(+id, body.aprobado);
  }
}
