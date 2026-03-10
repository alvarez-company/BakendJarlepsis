import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EstadosClienteService } from './estados-cliente.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES_ESTADOS_CAMPO } from '../../common/constants/roles.constants';

@ApiTags('estados-cliente')
@ApiBearerAuth()
@Controller('estados-cliente')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EstadosClienteController {
  constructor(private readonly estadosClienteService: EstadosClienteService) {}

  @Get()
  @Roles(...ROLES_ESTADOS_CAMPO)
  @ApiOperation({ summary: 'Get all estados de cliente' })
  findAll() {
    return this.estadosClienteService.findAll();
  }
}
