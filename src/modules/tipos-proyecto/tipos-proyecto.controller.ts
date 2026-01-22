import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TiposProyectoService } from './tipos-proyecto.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('tipos-proyecto')
@ApiBearerAuth()
@Controller('tipos-proyecto')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TiposProyectoController {
  constructor(private readonly service: TiposProyectoService) {}

  @Post()
  @Roles('superadmin', 'admin')
  create(@Body() data: any) {
    return this.service.create(data);
  }

  @Get()
  @Roles('superadmin', 'admin', 'tecnico')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles('superadmin', 'admin', 'tecnico')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin')
  update(@Param('id') id: string, @Body() data: any) {
    return this.service.update(+id, data);
  }

  @Delete(':id')
  @Roles('superadmin')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
