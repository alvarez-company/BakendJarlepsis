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
import { MaterialesService } from './materiales.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { AjustarStockDto } from './dto/ajustar-stock.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('materiales')
@ApiBearerAuth()
@Controller('materiales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaterialesController {
  constructor(private readonly materialesService: MaterialesService) {}

  @Post()
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Create a new material' })
  create(@Body() createMaterialDto: CreateMaterialDto, @Request() req) {
    return this.materialesService.create(createMaterialDto, req.user.usuarioId);
  }

  @Get()
  @Roles('superadmin', 'admin', 'tecnico', 'bodega', 'inventario')
  @ApiOperation({ summary: 'Get all materiales' })
  findAll(@Request() req) {
    return this.materialesService.findAll(req.user);
  }

  @Get(':id')
  @Roles('superadmin', 'admin', 'tecnico')
  @ApiOperation({ summary: 'Get a material by ID' })
  findOne(@Param('id') id: string) {
    return this.materialesService.findOne(+id);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Update a material' })
  update(@Param('id') id: string, @Body() updateMaterialDto: UpdateMaterialDto) {
    return this.materialesService.update(+id, updateMaterialDto);
  }

  @Post(':id/ajustar-stock')
  @Roles('superadmin', 'admin', 'tecnico')
  @ApiOperation({ summary: 'Ajustar stock de un material' })
  ajustarStock(@Param('id') id: string, @Body() ajustarStockDto: AjustarStockDto) {
    return this.materialesService.ajustarStock(+id, ajustarStockDto.cantidad);
  }

  @Delete(':id')
  @Roles('superadmin')
  @ApiOperation({ summary: 'Delete a material' })
  remove(@Param('id') id: string) {
    return this.materialesService.remove(+id);
  }
}

