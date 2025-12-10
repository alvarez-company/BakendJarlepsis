import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Res,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { InventariosService } from './inventarios.service';
import { CreateInventarioDto } from './dto/create-inventario.dto';
import { UpdateInventarioDto } from './dto/update-inventario.dto';
import { ExportacionService } from '../exportacion/exportacion.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('inventarios')
@ApiBearerAuth()
@Controller('inventarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventariosController {
  constructor(
    private readonly inventariosService: InventariosService,
    private readonly exportacionService: ExportacionService,
  ) {}

  @Post()
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Create a new inventario' })
  create(@Body() createInventarioDto: CreateInventarioDto) {
    return this.inventariosService.create(createInventarioDto);
  }

  @Get()
  @Roles('superadmin', 'admin', 'tecnico')
  @ApiOperation({ summary: 'Get all inventarios' })
  findAll() {
    return this.inventariosService.findAll();
  }

  @Get(':id')
  @Roles('superadmin', 'admin', 'tecnico')
  @ApiOperation({ summary: 'Get an inventario by ID' })
  findOne(@Param('id') id: string) {
    return this.inventariosService.findOne(+id);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Update an inventario' })
  update(@Param('id') id: string, @Body() updateInventarioDto: UpdateInventarioDto) {
    return this.inventariosService.update(+id, updateInventarioDto);
  }

  @Delete(':id')
  @Roles('superadmin')
  @ApiOperation({ summary: 'Delete an inventario' })
  remove(@Param('id') id: string) {
    return this.inventariosService.remove(+id);
  }

  @Get('export/excel')
  @Roles('superadmin', 'admin', 'tecnico')
  @ApiOperation({ summary: 'Export inventories to Excel' })
  @ApiQuery({ name: 'filters', required: false, type: String })
  async exportToExcel(@Res() res: Response, @Query('filters') filters?: string) {
    try {
      const inventarios = await this.inventariosService.findAll();
      
      let filteredData = inventarios;
      if (filters) {
        try {
          const filterObj = JSON.parse(filters);
          if (filterObj.search) {
            const search = filterObj.search.toLowerCase();
            filteredData = filteredData.filter((inv: any) =>
              inv.inventarioNombre?.toLowerCase().includes(search) ||
              inv.bodega?.bodegaNombre?.toLowerCase().includes(search)
            );
          }
        } catch (e) {}
      }

      const columns = [
        { key: 'inventarioNombre', label: 'Nombre' },
        { key: 'inventarioDescripcion', label: 'Descripción' },
        { key: 'bodega', label: 'Bodega' },
        { key: 'inventarioEstado', label: 'Estado' },
      ];

      const exportData = filteredData.map((inv: any) => ({
        inventarioNombre: inv.inventarioNombre || '-',
        inventarioDescripcion: inv.inventarioDescripcion || '-',
        bodega: inv.bodega?.bodegaNombre || 'Sin bodega',
        inventarioEstado: inv.inventarioEstado ? 'Activo' : 'Inactivo',
      }));

      const buffer = await this.exportacionService.exportToExcel({
        columns,
        data: exportData,
        filename: 'reporte-inventarios',
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-inventarios.xlsx"');
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ message: 'Error al exportar a Excel', error: error.message });
    }
  }

  @Get('export/pdf')
  @Roles('superadmin', 'admin', 'tecnico')
  @ApiOperation({ summary: 'Export inventories to PDF' })
  @ApiQuery({ name: 'filters', required: false, type: String })
  async exportToPdf(@Res() res: Response, @Query('filters') filters?: string) {
    try {
      const inventarios = await this.inventariosService.findAll();
      
      let filteredData = inventarios;
      if (filters) {
        try {
          const filterObj = JSON.parse(filters);
          if (filterObj.search) {
            const search = filterObj.search.toLowerCase();
            filteredData = filteredData.filter((inv: any) =>
              inv.inventarioNombre?.toLowerCase().includes(search) ||
              inv.bodega?.bodegaNombre?.toLowerCase().includes(search)
            );
          }
        } catch (e) {}
      }

      const columns = [
        { key: 'inventarioNombre', label: 'Nombre' },
        { key: 'inventarioDescripcion', label: 'Descripción' },
        { key: 'bodega', label: 'Bodega' },
        { key: 'inventarioEstado', label: 'Estado' },
      ];

      const exportData = filteredData.map((inv: any) => ({
        inventarioNombre: inv.inventarioNombre || '-',
        inventarioDescripcion: inv.inventarioDescripcion || '-',
        bodega: inv.bodega?.bodegaNombre || 'Sin bodega',
        inventarioEstado: inv.inventarioEstado ? 'Activo' : 'Inactivo',
      }));

      const buffer = await this.exportacionService.exportToPdf({
        columns,
        data: exportData,
        filename: 'reporte-inventarios',
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-inventarios.pdf"');
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ message: 'Error al exportar a PDF', error: error.message });
    }
  }
}

