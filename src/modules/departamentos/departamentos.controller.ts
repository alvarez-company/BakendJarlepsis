import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DepartamentosService } from './departamentos.service';
import { CreateDepartamentoDto } from './dto/create-departamento.dto';
import { UpdateDepartamentoDto } from './dto/update-departamento.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  ROLES_SUPERADMIN_GERENCIA,
  ROLES_VER_DEPARTAMENTOS,
} from '../../common/constants/roles.constants';

@ApiTags('departamentos')
@ApiBearerAuth()
@Controller('departamentos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepartamentosController {
  constructor(private readonly departamentosService: DepartamentosService) {}

  @Post()
  @Roles(...ROLES_SUPERADMIN_GERENCIA)
  @ApiOperation({ summary: 'Create a new departamento' })
  create(@Body() createDepartamentoDto: CreateDepartamentoDto) {
    return this.departamentosService.create(createDepartamentoDto);
  }

  @Get()
  @Roles(...ROLES_VER_DEPARTAMENTOS)
  @ApiOperation({ summary: 'Get all departamentos' })
  findAll() {
    return this.departamentosService.findAll();
  }

  @Get(':id')
  @Roles(...ROLES_VER_DEPARTAMENTOS)
  @ApiOperation({ summary: 'Get a departamento by ID' })
  findOne(@Param('id') id: string) {
    return this.departamentosService.findOne(+id);
  }

  @Patch(':id')
  @Roles(...ROLES_SUPERADMIN_GERENCIA)
  @ApiOperation({ summary: 'Update a departamento' })
  update(@Param('id') id: string, @Body() updateDepartamentoDto: UpdateDepartamentoDto) {
    return this.departamentosService.update(+id, updateDepartamentoDto);
  }

  @Delete(':id')
  @Roles(...ROLES_SUPERADMIN_GERENCIA)
  @ApiOperation({ summary: 'Delete a departamento' })
  remove(@Param('id') id: string) {
    return this.departamentosService.remove(+id);
  }
}
