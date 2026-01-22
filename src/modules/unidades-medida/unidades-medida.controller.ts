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
import { UnidadesMedidaService } from './unidades-medida.service';
import { CreateUnidadMedidaDto } from './dto/create-unidad-medida.dto';
import { UpdateUnidadMedidaDto } from './dto/update-unidad-medida.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('unidades-medida')
@ApiBearerAuth()
@Controller('unidades-medida')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UnidadesMedidaController {
  constructor(private readonly unidadesMedidaService: UnidadesMedidaService) {}

  @Post()
  @Roles('superadmin', 'admin')
  create(@Body() createUnidadMedidaDto: CreateUnidadMedidaDto, @Request() req) {
    return this.unidadesMedidaService.create(createUnidadMedidaDto, req.user.usuarioId);
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
  findAll() {
    return this.unidadesMedidaService.findAll();
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
  findOne(@Param('id') id: string) {
    return this.unidadesMedidaService.findOne(+id);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin')
  update(@Param('id') id: string, @Body() updateUnidadMedidaDto: UpdateUnidadMedidaDto) {
    return this.unidadesMedidaService.update(+id, updateUnidadMedidaDto);
  }

  @Delete(':id')
  @Roles('superadmin')
  remove(@Param('id') id: string) {
    return this.unidadesMedidaService.remove(+id);
  }
}
