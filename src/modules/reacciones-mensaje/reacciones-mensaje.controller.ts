import { Controller, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReaccionesMensajeService } from './reacciones-mensaje.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('reacciones-mensaje')
@ApiBearerAuth()
@Controller('reacciones-mensaje')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReaccionesMensajeController {
  constructor(private readonly service: ReaccionesMensajeService) {}

  @Post(':mensajeId')
  @Roles('superadmin', 'admin', 'tecnico', 'empleado')
  agregarReaccion(@Request() req, @Param('mensajeId') mensajeId: string, @Body() body: { tipoReaccion: string }) {
    return this.service.agregarReaccion(+mensajeId, req.user.usuarioId, body.tipoReaccion);
  }

  @Delete(':mensajeId')
  @Roles('superadmin', 'admin', 'tecnico', 'empleado')
  eliminarReaccion(@Request() req, @Param('mensajeId') mensajeId: string) {
    return this.service.eliminarReaccion(+mensajeId, req.user.usuarioId);
  }
}

