import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaisesService } from './paises.service';
import { CreatePaisDto } from './dto/create-pais.dto';
import { UpdatePaisDto } from './dto/update-pais.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('paises')
@ApiBearerAuth()
@Controller('paises')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaisesController {
  constructor(private readonly paisesService: PaisesService) {}

  @Post()
  @Roles('superadmin')
  @ApiOperation({ summary: 'Create a new país' })
  create(@Body() createPaisDto: CreatePaisDto) {
    return this.paisesService.create(createPaisDto);
  }

  @Get()
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Get all países' })
  findAll() {
    return this.paisesService.findAll();
  }

  @Get(':id')
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Get a país by ID' })
  findOne(@Param('id') id: string) {
    return this.paisesService.findOne(+id);
  }

  @Patch(':id')
  @Roles('superadmin')
  @ApiOperation({ summary: 'Update a país' })
  update(@Param('id') id: string, @Body() updatePaisDto: UpdatePaisDto) {
    return this.paisesService.update(+id, updatePaisDto);
  }

  @Delete(':id')
  @Roles('superadmin')
  @ApiOperation({ summary: 'Delete a país' })
  remove(@Param('id') id: string) {
    return this.paisesService.remove(+id);
  }
}

