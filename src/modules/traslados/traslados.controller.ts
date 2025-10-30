import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TrasladosService } from './traslados.service';
import { CreateTrasladoDto } from './dto/create-traslado.dto';
import { UpdateTrasladoDto } from './dto/update-traslado.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('traslados')
@ApiBearerAuth()
@Controller('traslados')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TrasladosController {
  constructor(private readonly trasladosService: TrasladosService) {}

  @Post()
  @Roles('superadmin', 'admin', 'traslados')
  @ApiOperation({ summary: 'Create a new traslado' })
  create(@Body() createTrasladoDto: CreateTrasladoDto) {
    return this.trasladosService.create(createTrasladoDto);
  }

  @Get()
  @Roles('superadmin', 'admin', 'traslados')
  @ApiOperation({ summary: 'Get all traslados' })
  findAll() {
    return this.trasladosService.findAll();
  }

  @Get(':id')
  @Roles('superadmin', 'admin', 'tecnico')
  @ApiOperation({ summary: 'Get a traslado by ID' })
  findOne(@Param('id') id: string) {
    return this.trasladosService.findOne(+id);
  }

  @Post(':id/completar')
  @Roles('superadmin', 'admin', 'traslados')
  @ApiOperation({ summary: 'Completar traslado (crea movimientos automáticamente)' })
  completarTraslado(@Param('id') id: string) {
    return this.trasladosService.completarTraslado(+id);
  }

  @Post(':id/cancelar')
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Cancelar traslado' })
  cancelarTraslado(@Param('id') id: string) {
    return this.trasladosService.cancelarTraslado(+id);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Update a traslado' })
  update(@Param('id') id: string, @Body() updateTrasladoDto: UpdateTrasladoDto) {
    return this.trasladosService.update(+id, updateTrasladoDto);
  }

  @Delete(':id')
  @Roles('superadmin')
  @ApiOperation({ summary: 'Delete a traslado' })
  remove(@Param('id') id: string) {
    return this.trasladosService.remove(+id);
  }
}
