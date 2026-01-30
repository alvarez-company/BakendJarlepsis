import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TiposDocumentosIdentidadService } from './tipos-documentos-identidad.service';
import { CreateTipoDocumentoIdentidadDto } from './dto/create-tipo-documento-identidad.dto';
import { UpdateTipoDocumentoIdentidadDto } from './dto/update-tipo-documento-identidad.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('tipos-documentos-identidad')
@ApiBearerAuth()
@Controller('tipos-documentos-identidad')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TiposDocumentosIdentidadController {
  constructor(private readonly tiposDocumentosService: TiposDocumentosIdentidadService) {}

  @Post()
  @Roles('superadmin', 'gerencia')
  @ApiOperation({ summary: 'Create a new tipo de documento identidad' })
  create(@Body() createDto: CreateTipoDocumentoIdentidadDto) {
    return this.tiposDocumentosService.create(createDto);
  }

  @Get()
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Get all tipos de documentos identidad' })
  findAll() {
    return this.tiposDocumentosService.findAll();
  }

  @Get(':id')
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Get a tipo de documento identidad by ID' })
  findOne(@Param('id') id: string) {
    return this.tiposDocumentosService.findOne(+id);
  }

  @Patch(':id')
  @Roles('superadmin', 'gerencia')
  @ApiOperation({ summary: 'Update a tipo de documento identidad' })
  update(@Param('id') id: string, @Body() updateDto: UpdateTipoDocumentoIdentidadDto) {
    return this.tiposDocumentosService.update(+id, updateDto);
  }

  @Delete(':id')
  @Roles('superadmin', 'gerencia')
  @ApiOperation({ summary: 'Delete a tipo de documento identidad' })
  remove(@Param('id') id: string) {
    return this.tiposDocumentosService.remove(+id);
  }
}
