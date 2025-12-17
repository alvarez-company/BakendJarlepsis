import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { MovimientosService } from './movimientos.service';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { ExportacionService } from '../exportacion/exportacion.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('movimientos')
@ApiBearerAuth()
@Controller('movimientos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MovimientosController {
  constructor(
    private readonly movimientosService: MovimientosService,
    private readonly exportacionService: ExportacionService,
  ) {}

  @Post()
  @Roles('superadmin', 'admin', 'tecnico', 'entradas', 'salidas', 'devoluciones')
  @ApiOperation({ summary: 'Create a new movimiento (Entrada, Salida o Devolución)' })
  create(@Body() createMovimientoDto: CreateMovimientoDto) {
    return this.movimientosService.create(createMovimientoDto);
  }

  @Get()
  @Roles('superadmin', 'admin', 'tecnico', 'entradas', 'salidas', 'devoluciones', 'traslados')
  @ApiOperation({ summary: 'Get all movimientos' })
  findAll(@Query('instalacionId') instalacionId?: string, @Query() paginationDto?: PaginationDto) {
    if (instalacionId) {
      return this.movimientosService.findByInstalacion(+instalacionId);
    }
    return this.movimientosService.findAll(paginationDto);
  }

  @Get('codigo/:codigo')
  @Roles('superadmin', 'admin', 'tecnico', 'entradas', 'salidas', 'devoluciones')
  @ApiOperation({ summary: 'Get movimientos by código' })
  findByCodigo(@Param('codigo') codigo: string) {
    return this.movimientosService.findByCodigo(codigo);
  }

  @Get('material/:materialId')
  @Roles('superadmin', 'admin', 'tecnico', 'bodega', 'inventario')
  @ApiOperation({ summary: 'Get movimientos by material ID with stock history' })
  findByMaterial(@Param('materialId') materialId: string) {
    return this.movimientosService.findByMaterial(+materialId);
  }

  @Get('bodega/:bodegaId/historial')
  @Roles('superadmin', 'admin', 'bodega', 'inventario')
  @ApiOperation({ summary: 'Get stock history by bodega ID' })
  findByBodega(@Param('bodegaId') bodegaId: string) {
    return this.movimientosService.findByBodega(+bodegaId);
  }

  @Get('sede/:sedeId/historial')
  @Roles('superadmin', 'admin', 'bodega', 'inventario')
  @ApiOperation({ summary: 'Get stock history by sede ID' })
  findBySede(@Param('sedeId') sedeId: string) {
    return this.movimientosService.findBySede(+sedeId);
  }

  @Get('tecnico/:usuarioId/historial')
  @Roles('superadmin', 'admin', 'tecnico', 'bodega', 'inventario')
  @ApiOperation({ summary: 'Get stock history by tecnico (usuario) ID' })
  findByTecnico(@Param('usuarioId') usuarioId: string) {
    return this.movimientosService.findByTecnico(+usuarioId);
  }

  @Get('export/excel')
  @Roles('superadmin', 'admin', 'tecnico', 'entradas', 'salidas', 'devoluciones', 'traslados')
  @ApiOperation({ summary: 'Export movements to Excel' })
  @ApiQuery({ name: 'filters', required: false, type: String })
  @ApiQuery({ name: 'dateStart', required: false, type: String })
  @ApiQuery({ name: 'dateEnd', required: false, type: String })
  async exportToExcel(@Res() res: Response, @Query('filters') filters?: string, @Query('instalacionId') instalacionId?: string, @Query('dateStart') dateStart?: string, @Query('dateEnd') dateEnd?: string) {
    try {
      const resultado = instalacionId 
        ? await this.movimientosService.findByInstalacion(+instalacionId)
        : await this.movimientosService.findAll();
      const movimientos = Array.isArray(resultado) ? resultado : resultado.data;
      
      let filteredData = movimientos;
      
      // Filtrar por fechas si se proporcionan
      if (dateStart || dateEnd) {
        const startDate = dateStart ? new Date(dateStart) : null;
        const endDate = dateEnd ? new Date(dateEnd) : null;
        if (endDate) endDate.setHours(23, 59, 59, 999);
        
        filteredData = filteredData.filter((m: any) => {
          const fecha = new Date(m.fechaCreacion || m.movimientoFechaCreacion);
          if (startDate && fecha < startDate) return false;
          if (endDate && fecha > endDate) return false;
          return true;
        });
      }
      
      if (filters) {
        try {
          const filterObj = JSON.parse(filters);
          if (filterObj.search) {
            const search = filterObj.search.toLowerCase();
            filteredData = filteredData.filter((m: any) =>
              m.movimientoCodigo?.toLowerCase().includes(search) ||
              m.material?.materialNombre?.toLowerCase().includes(search)
            );
          }
          // Filtrar por tipo de movimiento si se proporciona
          if (filterObj.tipo) {
            const tipoFilter = filterObj.tipo.toLowerCase();
            filteredData = filteredData.filter((m: any) => {
              const movimientoTipo = String(m.movimientoTipo || m.tipoMovimiento || '').toLowerCase();
              return movimientoTipo === tipoFilter;
            });
          }
        } catch (e) {}
      }

      const columns = [
        { key: 'movimientoCodigo', label: 'Código' },
        { key: 'tipoMovimiento', label: 'Tipo' },
        { key: 'material', label: 'Material' },
        { key: 'cantidad', label: 'Cantidad' },
        { key: 'inventario', label: 'Inventario' },
        { key: 'movimientoEstado', label: 'Estado' },
        { key: 'fechaCreacion', label: 'Fecha' },
      ];

      const exportData = filteredData.map((m: any) => ({
        movimientoCodigo: m.movimientoCodigo || '-',
        tipoMovimiento: m.movimientoTipo || m.tipoMovimiento || '-',
        material: m.material?.materialNombre || 'Sin material',
        cantidad: m.movimientoCantidad || m.cantidad || 0,
        inventario: m.inventario?.inventarioNombre || 'Sin inventario',
        movimientoEstado: m.movimientoEstado || '-',
        fechaCreacion: m.fechaCreacion ? new Date(m.fechaCreacion).toLocaleDateString('es-CO') : '-',
      }));

      const buffer = await this.exportacionService.exportToExcel({
        columns,
        data: exportData,
        filename: 'reporte-movimientos',
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-movimientos.xlsx"');
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ message: 'Error al exportar a Excel', error: error.message });
    }
  }

  @Get('export/pdf')
  @Roles('superadmin', 'admin', 'tecnico', 'entradas', 'salidas', 'devoluciones', 'traslados')
  @ApiOperation({ summary: 'Export movements to PDF' })
  @ApiQuery({ name: 'filters', required: false, type: String })
  @ApiQuery({ name: 'dateStart', required: false, type: String })
  @ApiQuery({ name: 'dateEnd', required: false, type: String })
  async exportToPdf(@Res() res: Response, @Query('filters') filters?: string, @Query('instalacionId') instalacionId?: string, @Query('dateStart') dateStart?: string, @Query('dateEnd') dateEnd?: string) {
    try {
      const resultado = instalacionId 
        ? await this.movimientosService.findByInstalacion(+instalacionId)
        : await this.movimientosService.findAll({ page: 1, limit: 10000 });
      const movimientos = Array.isArray(resultado) ? resultado : resultado.data;
      
      let filteredData = movimientos;
      
      // Filtrar por fechas si se proporcionan
      if (dateStart || dateEnd) {
        const startDate = dateStart ? new Date(dateStart) : null;
        const endDate = dateEnd ? new Date(dateEnd) : null;
        if (endDate) endDate.setHours(23, 59, 59, 999);
        
        filteredData = filteredData.filter((m: any) => {
          const fecha = new Date(m.fechaCreacion || m.movimientoFechaCreacion);
          if (startDate && fecha < startDate) return false;
          if (endDate && fecha > endDate) return false;
          return true;
        });
      }
      
      if (filters) {
        try {
          const filterObj = JSON.parse(filters);
          if (filterObj.search) {
            const search = filterObj.search.toLowerCase();
            filteredData = filteredData.filter((m: any) =>
              m.movimientoCodigo?.toLowerCase().includes(search) ||
              m.material?.materialNombre?.toLowerCase().includes(search)
            );
          }
          // Filtrar por tipo de movimiento si se proporciona
          if (filterObj.tipo) {
            const tipoFilter = filterObj.tipo.toLowerCase();
            filteredData = filteredData.filter((m: any) => {
              const movimientoTipo = String(m.movimientoTipo || m.tipoMovimiento || '').toLowerCase();
              return movimientoTipo === tipoFilter;
            });
          }
        } catch (e) {}
      }

      const columns = [
        { key: 'movimientoCodigo', label: 'Código' },
        { key: 'tipoMovimiento', label: 'Tipo' },
        { key: 'material', label: 'Material' },
        { key: 'cantidad', label: 'Cantidad' },
        { key: 'inventario', label: 'Inventario' },
        { key: 'movimientoEstado', label: 'Estado' },
        { key: 'fechaCreacion', label: 'Fecha' },
      ];

      const exportData = filteredData.map((m: any) => ({
        movimientoCodigo: m.movimientoCodigo || '-',
        tipoMovimiento: m.movimientoTipo || m.tipoMovimiento || '-',
        material: m.material?.materialNombre || 'Sin material',
        cantidad: m.movimientoCantidad || m.cantidad || 0,
        inventario: m.inventario?.inventarioNombre || 'Sin inventario',
        movimientoEstado: m.movimientoEstado || '-',
        fechaCreacion: m.fechaCreacion ? new Date(m.fechaCreacion).toLocaleDateString('es-CO') : '-',
      }));

      const buffer = await this.exportacionService.exportToPdf({
        columns,
        data: exportData,
        filename: 'reporte-movimientos',
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-movimientos.pdf"');
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ message: 'Error al exportar a PDF', error: error.message });
    }
  }

  @Get(':id')
  @Roles('superadmin', 'admin', 'tecnico')
  @ApiOperation({ summary: 'Get a movimiento by ID' })
  findOne(@Param('id') id: string) {
    return this.movimientosService.findOne(+id);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin', 'tecnico', 'entradas', 'salidas', 'devoluciones')
  @ApiOperation({ summary: 'Update a movimiento' })
  update(@Param('id') id: string, @Body() updateMovimientoDto: CreateMovimientoDto) {
    return this.movimientosService.update(+id, updateMovimientoDto);
  }

  @Delete(':id')
  @Roles('superadmin')
  @ApiOperation({ summary: 'Delete a movimiento' })
  async remove(@Param('id') id: string, @Request() req) {
    try {
      await this.movimientosService.remove(+id, req.user.usuarioId);
      return { message: 'Movimiento eliminado correctamente', success: true };
    } catch (error) {
      throw error;
    }
  }
}

