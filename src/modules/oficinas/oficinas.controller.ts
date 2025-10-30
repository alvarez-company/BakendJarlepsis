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
import { OficinasService } from './oficinas.service';
import { CreateOficinaDto } from './dto/create-oficina.dto';
import { UpdateOficinaDto } from './dto/update-oficina.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('oficinas')
@ApiBearerAuth()
@Controller('oficinas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OficinasController {
  constructor(private readonly oficinasService: OficinasService) {}

  @Post()
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Create a new oficina' })
  create(@Body() createOficinaDto: CreateOficinaDto) {
    return this.oficinasService.create(createOficinaDto);
  }

  @Get()
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Get all oficinas' })
  findAll(@Request() req) {
    return this.oficinasService.findAll(req.user);
  }

  @Get(':id')
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Get an oficina by ID' })
  findOne(@Param('id') id: string) {
    return this.oficinasService.findOne(+id);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Update an oficina' })
  update(@Param('id') id: string, @Body() updateOficinaDto: UpdateOficinaDto) {
    return this.oficinasService.update(+id, updateOficinaDto);
  }

  @Delete(':id')
  @Roles('superadmin')
  @ApiOperation({ summary: 'Delete an oficina' })
  remove(@Param('id') id: string) {
    return this.oficinasService.remove(+id);
  }
}

