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
import {
  ROLES_GESTION_CATEGORIAS,
  ROLES_VER_CATEGORIAS,
  ROLES_SUPERADMIN_GERENCIA,
} from '../../common/constants/roles.constants';

@ApiTags('unidades-medida')
@ApiBearerAuth()
@Controller('unidades-medida')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UnidadesMedidaController {
  constructor(private readonly unidadesMedidaService: UnidadesMedidaService) {}

  @Post()
  @Roles(...ROLES_GESTION_CATEGORIAS)
  create(@Body() createUnidadMedidaDto: CreateUnidadMedidaDto, @Request() req) {
    return this.unidadesMedidaService.create(createUnidadMedidaDto, req.user.usuarioId);
  }

  @Get()
  @Roles(...ROLES_VER_CATEGORIAS)
  findAll() {
    return this.unidadesMedidaService.findAll();
  }

  @Get(':id')
  @Roles(...ROLES_VER_CATEGORIAS)
  findOne(@Param('id') id: string) {
    return this.unidadesMedidaService.findOne(+id);
  }

  @Patch(':id')
  @Roles(...ROLES_GESTION_CATEGORIAS)
  update(@Param('id') id: string, @Body() updateUnidadMedidaDto: UpdateUnidadMedidaDto) {
    return this.unidadesMedidaService.update(+id, updateUnidadMedidaDto);
  }

  @Delete(':id')
  @Roles(...ROLES_SUPERADMIN_GERENCIA)
  remove(@Param('id') id: string) {
    return this.unidadesMedidaService.remove(+id);
  }
}
