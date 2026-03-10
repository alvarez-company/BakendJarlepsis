import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProveedoresService } from './proveedores.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  ROLES_GESTION_CATEGORIAS,
  ROLES_VER_PROVEEDORES,
  ROLES_SUPERADMIN_GERENCIA,
} from '../../common/constants/roles.constants';

@ApiTags('proveedores')
@ApiBearerAuth()
@Controller('proveedores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @Post()
  @Roles(...ROLES_GESTION_CATEGORIAS)
  @ApiOperation({ summary: 'Create a new proveedor' })
  create(@Body() createProveedorDto: CreateProveedorDto) {
    return this.proveedoresService.create(createProveedorDto);
  }

  @Get()
  @Roles(...ROLES_VER_PROVEEDORES)
  @ApiOperation({ summary: 'Get all proveedores' })
  findAll() {
    return this.proveedoresService.findAll();
  }

  @Get(':id')
  @Roles(...ROLES_VER_PROVEEDORES)
  @ApiOperation({ summary: 'Get a proveedor by ID' })
  findOne(@Param('id') id: string) {
    return this.proveedoresService.findOne(+id);
  }

  @Patch(':id')
  @Roles(...ROLES_GESTION_CATEGORIAS)
  @ApiOperation({ summary: 'Update a proveedor' })
  update(@Param('id') id: string, @Body() updateProveedorDto: UpdateProveedorDto) {
    return this.proveedoresService.update(+id, updateProveedorDto);
  }

  @Delete(':id')
  @Roles(...ROLES_SUPERADMIN_GERENCIA)
  @ApiOperation({ summary: 'Delete a proveedor' })
  remove(@Param('id') id: string) {
    return this.proveedoresService.remove(+id);
  }
}
