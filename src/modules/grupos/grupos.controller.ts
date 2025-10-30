import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { GruposService } from './grupos.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('grupos')
@ApiBearerAuth()
@Controller('grupos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GruposController {
  constructor(private readonly service: GruposService) {}

  @Get('general')
  @Roles('superadmin', 'admin', 'tecnico', 'empleado')
  obtenerGrupoGeneral() {
    return this.service.obtenerGrupoGeneral();
  }

  @Get('mis-grupos')
  @Roles('superadmin', 'admin', 'tecnico', 'empleado')
  obtenerMisGrupos(@Request() req) {
    return this.service.obtenerMisGrupos(req.user.usuarioId);
  }
}

