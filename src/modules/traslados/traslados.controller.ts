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
  Res,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { TrasladosService } from './traslados.service';
import { CreateTrasladoDto } from './dto/create-traslado.dto';
import { UpdateTrasladoDto } from './dto/update-traslado.dto';
import { ExportacionService } from '../exportacion/exportacion.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('traslados')
@ApiBearerAuth()
@Controller('traslados')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TrasladosController {
  constructor(
    private readonly trasladosService: TrasladosService,
    private readonly exportacionService: ExportacionService,
  ) {}

  @Post()
  @Roles('superadmin', 'almacenista')
  @ApiOperation({ summary: 'Create a new traslado' })
  create(@Body() createTrasladoDto: CreateTrasladoDto) {
    return this.trasladosService.create(createTrasladoDto);
  }

  @Get()
  @Roles(
    'superadmin',
    'admin',
    'admin-internas',
    'admin-redes',
    'almacenista',
    'tecnico',
    'soldador',
    'bodega-internas',
    'bodega-redes',
  )
  @ApiOperation({ summary: 'Get all traslados' })
  findAll(@Query() paginationDto?: PaginationDto, @Request() req?: any) {
    return this.trasladosService.findAll(paginationDto, req?.user);
  }

  @Get('codigo/:codigo')
  @Roles(
    'superadmin',
    'admin',
    'admin-internas',
    'admin-redes',
    'almacenista',
    'tecnico',
    'soldador',
  )
  @ApiOperation({ summary: 'Get traslados by código' })
  findByCodigo(@Param('codigo') codigo: string) {
    return this.trasladosService.findByCodigo(codigo);
  }

  @Get(':id')
  @Roles(
    'superadmin',
    'admin',
    'admin-internas',
    'admin-redes',
    'almacenista',
    'tecnico',
    'soldador',
    'bodega-internas',
    'bodega-redes',
  )
  @ApiOperation({ summary: 'Get a traslado by ID' })
  findOne(@Param('id') id: string, @Request() req?: any) {
    return this.trasladosService.findOne(+id, req?.user);
  }

  @Post(':id/completar')
  @Roles('superadmin', 'almacenista')
  @ApiOperation({ summary: 'Completar traslado (crea movimientos automáticamente)' })
  completarTraslado(@Param('id') id: string) {
    return this.trasladosService.completarTraslado(+id);
  }

  @Post(':id/cancelar')
  @Roles('superadmin', 'almacenista')
  @ApiOperation({ summary: 'Cancelar traslado' })
  cancelarTraslado(@Param('id') id: string) {
    return this.trasladosService.cancelarTraslado(+id);
  }

  @Patch(':id')
  @Roles('superadmin', 'almacenista')
  @ApiOperation({ summary: 'Update a traslado' })
  update(@Param('id') id: string, @Body() updateTrasladoDto: UpdateTrasladoDto) {
    return this.trasladosService.update(+id, updateTrasladoDto);
  }

  @Delete(':id')
  @Roles('superadmin', 'almacenista')
  @ApiOperation({ summary: 'Delete a traslado' })
  remove(@Param('id') id: string, @Request() req) {
    return this.trasladosService.remove(+id, req.user.usuarioId);
  }

  @Get('export/excel')
  @Roles(
    'superadmin',
    'admin',
    'admin-internas',
    'admin-redes',
    'almacenista',
    'tecnico',
    'soldador',
  )
  @ApiOperation({ summary: 'Export transfers to Excel' })
  @ApiQuery({ name: 'filters', required: false, type: String })
  @ApiQuery({ name: 'dateStart', required: false, type: String })
  @ApiQuery({ name: 'dateEnd', required: false, type: String })
  async exportToExcel(
    @Res() res: Response,
    @Query('filters') filters?: string,
    @Query('dateStart') dateStart?: string,
    @Query('dateEnd') dateEnd?: string,
  ) {
    try {
      const resultado = await this.trasladosService.findAll({ page: 1, limit: 10000 });
      const traslados = resultado.data;

      let filteredData = traslados;

      // Filtrar por fechas si se proporcionan
      if (dateStart || dateEnd) {
        const startDate = dateStart ? new Date(dateStart) : null;
        const endDate = dateEnd ? new Date(dateEnd) : null;
        if (endDate) endDate.setHours(23, 59, 59, 999);

        filteredData = filteredData.filter((t: any) => {
          const fecha = new Date(t.fechaCreacion || t.trasladoFechaCreacion);
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
            filteredData = filteredData.filter(
              (t: any) =>
                t.trasladoCodigo?.toLowerCase().includes(search) ||
                t.material?.materialNombre?.toLowerCase().includes(search) ||
                t.material?.materialCodigo?.toLowerCase().includes(search),
            );
          }
        } catch (_e) {
          // Ignorar errores de filtrado, continuar sin filtrar
        }
      }

      const columns = [
        { key: 'trasladoCodigo', label: 'Código' },
        { key: 'material', label: 'Material' },
        { key: 'cantidad', label: 'Cantidad' },
        { key: 'bodegaOrigen', label: 'Bodega Origen' },
        { key: 'bodegaDestino', label: 'Bodega Destino' },
        { key: 'trasladoEstado', label: 'Estado' },
        { key: 'fechaCreacion', label: 'Fecha' },
      ];

      const exportData = filteredData.map((t: any) => ({
        trasladoCodigo: t.trasladoCodigo || '-',
        material: t.material?.materialNombre || 'Sin material',
        cantidad: t.cantidad || 0,
        bodegaOrigen: t.bodegaOrigen?.bodegaNombre || 'Sin bodega',
        bodegaDestino: t.bodegaDestino?.bodegaNombre || 'Sin bodega',
        trasladoEstado: t.trasladoEstado || '-',
        fechaCreacion: t.fechaCreacion
          ? new Date(t.fechaCreacion).toLocaleDateString('es-CO')
          : '-',
      }));

      const buffer = await this.exportacionService.exportToExcel({
        columns,
        data: exportData,
        filename: 'reporte-traslados',
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-traslados.xlsx"');
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ message: 'Error al exportar a Excel', error: error.message });
    }
  }

  @Get('export/pdf')
  @Roles(
    'superadmin',
    'admin',
    'admin-internas',
    'admin-redes',
    'almacenista',
    'tecnico',
    'soldador',
  )
  @ApiOperation({ summary: 'Export transfers to PDF' })
  @ApiQuery({ name: 'filters', required: false, type: String })
  @ApiQuery({ name: 'dateStart', required: false, type: String })
  @ApiQuery({ name: 'dateEnd', required: false, type: String })
  async exportToPdf(
    @Res() res: Response,
    @Query('filters') filters?: string,
    @Query('dateStart') dateStart?: string,
    @Query('dateEnd') dateEnd?: string,
  ) {
    try {
      const resultado = await this.trasladosService.findAll({ page: 1, limit: 10000 });
      const traslados = resultado.data;

      let filteredData = traslados;

      // Filtrar por fechas si se proporcionan
      if (dateStart || dateEnd) {
        const startDate = dateStart ? new Date(dateStart) : null;
        const endDate = dateEnd ? new Date(dateEnd) : null;
        if (endDate) endDate.setHours(23, 59, 59, 999);

        filteredData = filteredData.filter((t: any) => {
          const fecha = new Date(t.fechaCreacion || t.trasladoFechaCreacion);
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
            filteredData = filteredData.filter(
              (t: any) =>
                t.trasladoCodigo?.toLowerCase().includes(search) ||
                t.material?.materialNombre?.toLowerCase().includes(search) ||
                t.material?.materialCodigo?.toLowerCase().includes(search),
            );
          }
        } catch (_e) {
          // Ignorar errores de filtrado, continuar sin filtrar
        }
      }

      const columns = [
        { key: 'trasladoCodigo', label: 'Código' },
        { key: 'material', label: 'Material' },
        { key: 'cantidad', label: 'Cantidad' },
        { key: 'bodegaOrigen', label: 'Bodega Origen' },
        { key: 'bodegaDestino', label: 'Bodega Destino' },
        { key: 'trasladoEstado', label: 'Estado' },
        { key: 'fechaCreacion', label: 'Fecha' },
      ];

      const exportData = filteredData.map((t: any) => ({
        trasladoCodigo: t.trasladoCodigo || '-',
        material: t.material?.materialNombre || 'Sin material',
        cantidad: t.cantidad || 0,
        bodegaOrigen: t.bodegaOrigen?.bodegaNombre || 'Sin bodega',
        bodegaDestino: t.bodegaDestino?.bodegaNombre || 'Sin bodega',
        trasladoEstado: t.trasladoEstado || '-',
        fechaCreacion: t.fechaCreacion
          ? new Date(t.fechaCreacion).toLocaleDateString('es-CO')
          : '-',
      }));

      const buffer = await this.exportacionService.exportToPdf({
        columns,
        data: exportData,
        filename: 'reporte-traslados',
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-traslados.pdf"');
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ message: 'Error al exportar a PDF', error: error.message });
    }
  }
}
