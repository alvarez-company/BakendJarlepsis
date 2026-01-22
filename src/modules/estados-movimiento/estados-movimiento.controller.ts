import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EstadosMovimientoService } from './estados-movimiento.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('estados-movimiento')
@ApiBearerAuth()
@Controller('estados-movimiento')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EstadosMovimientoController {
  constructor(private readonly estadosMovimientoService: EstadosMovimientoService) {}

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
  @ApiOperation({ summary: 'Get all estados de movimiento' })
  findAll() {
    return this.estadosMovimientoService.findAll();
  }
}
