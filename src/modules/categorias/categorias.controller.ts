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
import { CategoriasService } from './categorias.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('categorias')
@ApiBearerAuth()
@Controller('categorias')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  @Post()
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Create a new categoria' })
  create(@Body() createCategoriaDto: CreateCategoriaDto) {
    return this.categoriasService.create(createCategoriaDto);
  }

  @Get()
  @Roles('superadmin', 'admin', 'tecnico')
  @ApiOperation({ summary: 'Get all categorias' })
  findAll() {
    return this.categoriasService.findAll();
  }

  @Get(':id')
  @Roles('superadmin', 'admin', 'tecnico')
  @ApiOperation({ summary: 'Get a categoria by ID' })
  findOne(@Param('id') id: string) {
    return this.categoriasService.findOne(+id);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Update a categoria' })
  update(@Param('id') id: string, @Body() updateCategoriaDto: UpdateCategoriaDto) {
    return this.categoriasService.update(+id, updateCategoriaDto);
  }

  @Delete(':id')
  @Roles('superadmin')
  @ApiOperation({ summary: 'Delete a categoria' })
  remove(@Param('id') id: string) {
    return this.categoriasService.remove(+id);
  }
}

