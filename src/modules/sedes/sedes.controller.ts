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
import { SedesService } from './sedes.service';
import { CreateSedeDto } from './dto/create-sede.dto';
import { UpdateSedeDto } from './dto/update-sede.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('sedes')
@ApiBearerAuth()
@Controller('sedes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SedesController {
  constructor(private readonly sedesService: SedesService) {}

  @Post()
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Create a new sede' })
  create(@Body() createSedeDto: CreateSedeDto) {
    return this.sedesService.create(createSedeDto);
  }

  @Get()
  @Roles('superadmin', 'admin', 'administrador', 'admin-internas', 'admin-redes')
  @ApiOperation({ summary: 'Get all sedes' })
  findAll(@Request() req) {
    return this.sedesService.findAll(req.user);
  }

  @Get(':id')
  @Roles('superadmin', 'admin', 'administrador', 'admin-internas', 'admin-redes')
  @ApiOperation({ summary: 'Get a sede by ID' })
  findOne(@Param('id') id: string, @Request() req?: any) {
    return this.sedesService.findOne(+id, req?.user);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Update a sede' })
  update(@Param('id') id: string, @Body() updateSedeDto: UpdateSedeDto, @Request() req) {
    return this.sedesService.update(+id, updateSedeDto, req.user);
  }

  @Delete(':id')
  @Roles('superadmin')
  @ApiOperation({ summary: 'Delete a sede' })
  remove(@Param('id') id: string, @Request() req) {
    return this.sedesService.remove(+id, req.user);
  }
}
