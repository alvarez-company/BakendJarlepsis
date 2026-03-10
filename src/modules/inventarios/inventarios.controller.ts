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
  Request,
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
import { ImpersonationGuard } from '../auth/guards/impersonation.guard';
import {
  ROLES_ALMACENISTA,
  ROLES_VER_MATERIALES_INVENTARIO,
  ROLES_SUPERADMIN_GERENCIA,
} from '../../common/constants/roles.constants';

@ApiTags('inventarios')
@ApiBearerAuth()
@Controller('inventarios')
@UseGuards(JwtAuthGuard, ImpersonationGuard, RolesGuard)
export class InventariosController {
  constructor(
    private readonly inventariosService: InventariosService,
    private readonly exportacionService: ExportacionService,
  ) {}

  @Post()
  @Roles(...ROLES_ALMACENISTA)
  @ApiOperation({ summary: 'Create a new inventario' })
  create(@Body() createInventarioDto: CreateInventarioDto) {
    return this.inventariosService.create(createInventarioDto);
  }

  @Get()
  @Roles(...ROLES_VER_MATERIALES_INVENTARIO)
  @ApiOperation({ summary: 'Get all inventarios' })
  findAll(@Request() req) {
    return this.inventariosService.findAll(req.user);
  }

  @Get(':id')
  @Roles(...ROLES_VER_MATERIALES_INVENTARIO)
  @ApiOperation({ summary: 'Get an inventario by ID' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.inventariosService.findOne(+id, req.user);
  }

  @Patch(':id')
  @Roles(...ROLES_ALMACENISTA)
  @ApiOperation({ summary: 'Update an inventario' })
  update(@Param('id') id: string, @Body() updateInventarioDto: UpdateInventarioDto) {
    return this.inventariosService.update(+id, updateInventarioDto);
  }

  @Delete(':id')
  @Roles(...ROLES_SUPERADMIN_GERENCIA)
  @ApiOperation({ summary: 'Delete an inventario' })
  remove(@Param('id') id: string) {
    return this.inventariosService.remove(+id);
  }

  @Get('export/excel')
  @Roles(...ROLES_VER_MATERIALES_INVENTARIO)
  @ApiOperation({ summary: 'Export inventories to Excel' })
  @ApiQuery({ name: 'filters', required: false, type: String })
  async exportToExcel(
    @Res() res: Response,
    @Query('filters') filters?: string,
    @Request() req?: any,
  ) {
    try {
      const inventarios = await this.inventariosService.findAll(req?.user);

      let filteredData = inventarios;
      if (filters) {
        try {
          const filterObj = JSON.parse(filters);
          if (filterObj.search) {
            const search = filterObj.search.toLowerCase();
            filteredData = filteredData.filter(
              (inv: any) =>
                inv.inventarioNombre?.toLowerCase().includes(search) ||
                inv.bodega?.bodegaNombre?.toLowerCase().includes(search),
            );
          }
        } catch (_e) {
          // Ignorar errores de filtrado, continuar sin filtrar
        }
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

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-inventarios.xlsx"');
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ message: 'Error al exportar a Excel', error: error.message });
    }
  }

  @Get('export/pdf')
  @Roles(...ROLES_VER_MATERIALES_INVENTARIO)
  @ApiOperation({ summary: 'Export inventories to PDF' })
  @ApiQuery({ name: 'filters', required: false, type: String })
  async exportToPdf(
    @Res() res: Response,
    @Query('filters') filters?: string,
    @Request() req?: any,
  ) {
    try {
      const inventarios = await this.inventariosService.findAll(req?.user);

      let filteredData = inventarios;
      if (filters) {
        try {
          const filterObj = JSON.parse(filters);
          if (filterObj.search) {
            const search = filterObj.search.toLowerCase();
            filteredData = filteredData.filter(
              (inv: any) =>
                inv.inventarioNombre?.toLowerCase().includes(search) ||
                inv.bodega?.bodegaNombre?.toLowerCase().includes(search),
            );
          }
        } catch (_e) {
          // Ignorar errores de filtrado, continuar sin filtrar
        }
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
