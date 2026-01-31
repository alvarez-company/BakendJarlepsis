import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EstadosTrasladoService } from './estados-traslado.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('estados-traslado')
@ApiBearerAuth()
@Controller('estados-traslado')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EstadosTrasladoController {
  constructor(private readonly estadosTrasladoService: EstadosTrasladoService) {}

  @Get()
  @Roles(
    'superadmin',
    'admin',
    'almacenista',
    'tecnico',
    'soldador',
    'bodega-internas',
    'bodega-redes',
  )
  @ApiOperation({ summary: 'Get all estados de traslado' })
  findAll() {
    return this.estadosTrasladoService.findAll();
  }
}
