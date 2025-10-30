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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InstalacionesService } from './instalaciones.service';
import { CreateInstalacionDto } from './dto/create-instalacion.dto';
import { UpdateInstalacionDto } from './dto/update-instalacion.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('instalaciones')
@ApiBearerAuth()
@Controller('instalaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InstalacionesController {
  constructor(private readonly instalacionesService: InstalacionesService) {}

  @Post()
  @Roles('superadmin', 'admin', 'tecnico')
  @ApiOperation({ summary: 'Create a new instalacion' })
  create(@Body() createInstalacionDto: CreateInstalacionDto, @Request() req) {
    return this.instalacionesService.create(createInstalacionDto, req.user.usuarioId);
  }

  @Get()
  @Roles('superadmin', 'admin', 'tecnico', 'instalaciones')
  @ApiOperation({ summary: 'Get all instalaciones' })
  findAll(@Request() req) {
    return this.instalacionesService.findAll(req.user);
  }

  @Get(':id')
  @Roles('superadmin', 'admin', 'tecnico')
  @ApiOperation({ summary: 'Get an instalacion by ID' })
  findOne(@Param('id') id: string) {
    return this.instalacionesService.findOne(+id);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin', 'tecnico')
  @ApiOperation({ summary: 'Update an instalacion' })
  update(@Param('id') id: string, @Body() updateInstalacionDto: UpdateInstalacionDto) {
    return this.instalacionesService.update(+id, updateInstalacionDto);
  }

  @Delete(':id')
  @Roles('superadmin')
  @ApiOperation({ summary: 'Delete an instalacion' })
  remove(@Param('id') id: string) {
    return this.instalacionesService.remove(+id);
  }

  @Post(':id/actualizar-estado')
  @Roles('superadmin', 'admin', 'tecnico')
  @ApiOperation({ summary: 'Update instalacion status' })
  actualizarEstado(@Param('id') id: string, @Body() body: { estado: string }, @Request() req) {
    return this.instalacionesService.actualizarEstado(+id, body.estado as any, req.user.usuarioId);
  }
}
