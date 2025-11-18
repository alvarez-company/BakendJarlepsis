import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MovimientosService } from './movimientos.service';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('movimientos')
@ApiBearerAuth()
@Controller('movimientos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MovimientosController {
  constructor(private readonly movimientosService: MovimientosService) {}

  @Post()
  @Roles('superadmin', 'admin', 'tecnico', 'entradas', 'salidas', 'devoluciones')
  @ApiOperation({ summary: 'Create a new movimiento (Entrada, Salida o Devolución)' })
  create(@Body() createMovimientoDto: CreateMovimientoDto) {
    return this.movimientosService.create(createMovimientoDto);
  }

  @Get()
  @Roles('superadmin', 'admin', 'tecnico', 'entradas', 'salidas', 'devoluciones', 'traslados')
  @ApiOperation({ summary: 'Get all movimientos' })
  findAll(@Query('instalacionId') instalacionId?: string) {
    if (instalacionId) {
      return this.movimientosService.findByInstalacion(+instalacionId);
    }
    return this.movimientosService.findAll();
  }

  @Get('codigo/:codigo')
  @Roles('superadmin', 'admin', 'tecnico', 'entradas', 'salidas', 'devoluciones')
  @ApiOperation({ summary: 'Get movimientos by código' })
  findByCodigo(@Param('codigo') codigo: string) {
    return this.movimientosService.findByCodigo(codigo);
  }

  @Get(':id')
  @Roles('superadmin', 'admin', 'tecnico')
  @ApiOperation({ summary: 'Get a movimiento by ID' })
  findOne(@Param('id') id: string) {
    return this.movimientosService.findOne(+id);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin', 'tecnico', 'entradas', 'salidas', 'devoluciones')
  @ApiOperation({ summary: 'Update a movimiento' })
  update(@Param('id') id: string, @Body() updateMovimientoDto: CreateMovimientoDto) {
    return this.movimientosService.update(+id, updateMovimientoDto);
  }

  @Delete(':id')
  @Roles('superadmin')
  @ApiOperation({ summary: 'Delete a movimiento' })
  remove(@Param('id') id: string) {
    return this.movimientosService.remove(+id);
  }
}

