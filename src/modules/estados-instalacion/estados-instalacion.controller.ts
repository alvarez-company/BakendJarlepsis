import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EstadosInstalacionService } from './estados-instalacion.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES_ESTADOS_CAMPO } from '../../common/constants/roles.constants';

@ApiTags('estados-instalacion')
@ApiBearerAuth()
@Controller('estados-instalacion')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EstadosInstalacionController {
  constructor(private readonly estadosInstalacionService: EstadosInstalacionService) {}

  @Get()
  @Roles(...ROLES_ESTADOS_CAMPO)
  @ApiOperation({ summary: 'Get all estados de instalación' })
  findAll() {
    return this.estadosInstalacionService.findAll();
  }
}
