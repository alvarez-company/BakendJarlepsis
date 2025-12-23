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
import { BodegasService } from './bodegas.service';
import { CreateBodegaDto } from './dto/create-bodega.dto';
import { UpdateBodegaDto } from './dto/update-bodega.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('bodegas')
@ApiBearerAuth()
@Controller('bodegas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BodegasController {
  constructor(private readonly bodegasService: BodegasService) {}

  @Post()
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Create a new bodega' })
  create(@Body() createBodegaDto: CreateBodegaDto) {
    return this.bodegasService.create(createBodegaDto);
  }

  @Get()
  @Roles('superadmin', 'admin', 'administrador', 'bodega', 'bodega-internas', 'bodega-redes', 'almacenista')
  @ApiOperation({ summary: 'Get all bodegas' })
  findAll(@Request() req) {
    return this.bodegasService.findAll(req.user);
  }

  @Get(':id')
  @Roles('superadmin', 'admin', 'administrador', 'bodega', 'bodega-internas', 'bodega-redes', 'almacenista')
  @ApiOperation({ summary: 'Get a bodega by ID' })
  findOne(@Param('id') id: string) {
    return this.bodegasService.findOne(+id);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Update a bodega' })
  update(@Param('id') id: string, @Body() updateBodegaDto: UpdateBodegaDto) {
    return this.bodegasService.update(+id, updateBodegaDto);
  }

  @Delete(':id')
  @Roles('superadmin')
  @ApiOperation({ summary: 'Delete a bodega' })
  remove(@Param('id') id: string) {
    return this.bodegasService.remove(+id);
  }
}

