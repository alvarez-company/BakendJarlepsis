import { Controller, Get, Post, Body, Param, Delete, Put, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InstalacionesMaterialesService } from './instalaciones-materiales.service';
import { CreateInstalacionMaterialDto, UpdateInstalacionMaterialDto, AssignMaterialesToInstalacionDto } from './dto/create-instalacion-material.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('instalaciones-materiales')
@ApiBearerAuth()
@Controller('instalaciones-materiales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InstalacionesMaterialesController {
  constructor(private readonly service: InstalacionesMaterialesService) {}

  @Post()
  @Roles('superadmin', 'admin', 'tecnico', 'instalaciones')
  @ApiOperation({ summary: 'Crear registro de material utilizado en instalación' })
  create(@Body() createDto: CreateInstalacionMaterialDto) {
    return this.service.create(createDto);
  }

  @Post('instalacion/:instalacionId/asignar')
  @Roles('superadmin', 'admin', 'tecnico', 'instalaciones')
  @ApiOperation({ summary: 'Asignar múltiples materiales a una instalación' })
  asignarMateriales(
    @Param('instalacionId') instalacionId: string,
    @Body() dto: AssignMaterialesToInstalacionDto,
  ) {
    return this.service.asignarMateriales(+instalacionId, dto);
  }

  @Get()
  @Roles('superadmin', 'admin', 'instalaciones')
  @ApiOperation({ summary: 'Obtener todos los materiales utilizados en instalaciones' })
  findAll() {
    return this.service.findAll();
  }

  @Get('instalacion/:instalacionId')
  @Roles('superadmin', 'admin', 'administrador', 'almacenista', 'tecnico', 'soldador', 'empleado', 'instalaciones')
  @ApiOperation({ summary: 'Obtener materiales utilizados en una instalación específica' })
  findByInstalacion(@Param('instalacionId') instalacionId: string) {
    return this.service.findByInstalacion(+instalacionId);
  }

  @Get('material/:materialId')
  @Roles('superadmin', 'admin', 'instalaciones')
  @ApiOperation({ summary: 'Obtener instalaciones que utilizaron un material específico' })
  findByMaterial(@Param('materialId') materialId: string) {
    return this.service.findByMaterial(+materialId);
  }

  @Get(':id')
  @Roles('superadmin', 'admin', 'instalaciones')
  @ApiOperation({ summary: 'Obtener un registro de material de instalación por ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Put(':id')
  @Roles('superadmin', 'admin', 'tecnico', 'instalaciones')
  @ApiOperation({ summary: 'Actualizar material de instalación' })
  update(@Param('id') id: string, @Body() updateDto: UpdateInstalacionMaterialDto) {
    return this.service.update(+id, updateDto);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin', 'tecnico', 'instalaciones')
  @ApiOperation({ summary: 'Actualizar parcialmente material de instalación' })
  patch(@Param('id') id: string, @Body() updateDto: UpdateInstalacionMaterialDto) {
    return this.service.update(+id, updateDto);
  }

  @Delete(':id')
  @Roles('superadmin', 'admin', 'instalaciones')
  @ApiOperation({ summary: 'Eliminar registro de material de instalación' })
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }

  @Delete('instalacion/:instalacionId')
  @Roles('superadmin', 'admin', 'instalaciones')
  @ApiOperation({ summary: 'Eliminar todos los materiales de una instalación' })
  removeByInstalacion(@Param('instalacionId') instalacionId: string) {
    return this.service.removeByInstalacion(+instalacionId);
  }

  @Post(':id/aprobar')
  @Roles('superadmin', 'admin', 'almacenista', 'tecnico', 'instalaciones')
  @ApiOperation({ summary: 'Aprobar o desaprobar un material utilizado' })
  aprobarMaterial(
    @Param('id') id: string,
    @Body() body: { aprobado: boolean }
  ) {
    return this.service.aprobarMaterial(+id, body.aprobado);
  }
}

