import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsuariosGruposService } from './usuarios-grupos.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('usuarios-grupos')
@ApiBearerAuth()
@Controller('usuarios-grupos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosGruposController {
  constructor(private readonly service: UsuariosGruposService) {}

  @Post('agregar')
  @Roles('superadmin', 'admin')
  agregarUsuarios(@Body() body: { grupoId: number; usuariosId: number[] }) {
    return this.service.agregarUsuariosGrupo(body.grupoId, body.usuariosId);
  }
}

