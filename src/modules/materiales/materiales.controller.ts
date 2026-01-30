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
import { MaterialesService } from './materiales.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { AjustarStockDto } from './dto/ajustar-stock.dto';
import { ExportacionService } from '../exportacion/exportacion.service';
import { NumerosMedidorService } from '../numeros-medidor/numeros-medidor.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('materiales')
@ApiBearerAuth()
@Controller('materiales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaterialesController {
  constructor(
    private readonly materialesService: MaterialesService,
    private readonly exportacionService: ExportacionService,
    private readonly numerosMedidorService: NumerosMedidorService,
  ) {}

  @Post()
  @Roles('superadmin', 'almacenista')
  @ApiOperation({ summary: 'Create a new material' })
  create(@Body() createMaterialDto: CreateMaterialDto, @Request() req) {
    return this.materialesService.create(createMaterialDto, req.user.usuarioId);
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
  @ApiOperation({ summary: 'Get all materiales' })
  findAll(@Request() req) {
    return this.materialesService.findAll(req.user);
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
  @ApiOperation({ summary: 'Get a material by ID' })
  findOne(@Param('id') id: string, @Request() req?: any) {
    return this.materialesService.findOne(+id, req?.user);
  }

  @Patch(':id')
  @Roles('superadmin', 'almacenista')
  @ApiOperation({ summary: 'Update a material' })
  update(@Param('id') id: string, @Body() updateMaterialDto: UpdateMaterialDto, @Request() req) {
    return this.materialesService.update(+id, updateMaterialDto, req.user.usuarioId);
  }

  @Post(':id/ajustar-stock')
  @Roles('superadmin', 'almacenista')
  @ApiOperation({ summary: 'Ajustar stock de un material' })
  ajustarStock(@Param('id') id: string, @Body() ajustarStockDto: AjustarStockDto, @Request() req) {
    return this.materialesService.ajustarStock(
      +id,
      ajustarStockDto.cantidad,
      ajustarStockDto.bodegaId,
      req.user.usuarioId,
    );
  }

  @Post(':id/duplicate')
  @Roles('superadmin', 'almacenista')
  @ApiOperation({ summary: 'Duplicar un material' })
  duplicate(@Param('id') id: string, @Request() req) {
    return this.materialesService.duplicate(+id, req.user.usuarioId);
  }

  @Post(':id/asignar-numeros-medidor')
  @Roles('superadmin', 'admin', 'almacenista')
  @ApiOperation({
    summary:
      'Asignar números de medidor a un material. El material se marcará automáticamente como medidor si no lo está.',
  })
  async asignarNumerosMedidor(@Param('id') id: string, @Body() body: { numerosMedidor: string[] }) {
    return this.numerosMedidorService.crearMultiples(+id, body.numerosMedidor);
  }

  @Delete(':id')
  @Roles('superadmin', 'gerencia')
  @ApiOperation({ summary: 'Delete a material' })
  remove(@Param('id') id: string) {
    return this.materialesService.remove(+id);
  }

  @Get('export/excel')
  @Roles(
    'superadmin',
    'admin',
    'admin-internas',
    'admin-redes',
    'almacenista',
    'tecnico',
    'bodega-internas',
    'bodega-redes',
  )
  @ApiOperation({ summary: 'Export materials to Excel' })
  @ApiQuery({ name: 'filters', required: false, type: String })
  async exportToExcel(@Request() req, @Res() res: Response, @Query('filters') filters?: string) {
    try {
      const materiales = await this.materialesService.findAll(req.user);

      // Parsear filtros si existen
      let filteredData = materiales;
      if (filters) {
        try {
          const filterObj = JSON.parse(filters);
          // Aplicar filtros básicos
          if (filterObj.search) {
            const search = filterObj.search.toLowerCase();
            filteredData = filteredData.filter(
              (m: any) =>
                m.materialNombre?.toLowerCase().includes(search) ||
                m.materialCodigo?.toLowerCase().includes(search),
            );
          }
        } catch (e) {
          // Si hay error parseando filtros, usar todos los datos
        }
      }

      const columns = [
        { key: 'materialCodigo', label: 'Código' },
        { key: 'materialNombre', label: 'Nombre' },
        { key: 'materialDescripcion', label: 'Descripción' },
        { key: 'categoria', label: 'Categoría' },
        { key: 'proveedor', label: 'Proveedor' },
        { key: 'materialStock', label: 'Stock' },
        { key: 'materialPrecio', label: 'Precio' },
        { key: 'unidadMedida', label: 'Unidad de Medida' },
        { key: 'materialEstado', label: 'Estado' },
      ];

      const exportData = filteredData.map((m: any) => ({
        materialCodigo: m.materialCodigo || '-',
        materialNombre: m.materialNombre,
        materialDescripcion: m.materialDescripcion || '-',
        categoria: m.categoria?.categoriaNombre || 'Sin categoría',
        proveedor: m.proveedor?.proveedorNombre || 'Sin proveedor',
        materialStock: m.materialStock || 0,
        materialPrecio: m.materialPrecio || 0,
        unidadMedida:
          m.unidadMedida?.unidadMedidaNombre || m.unidadMedida?.unidadMedidaSimbolo || '-',
        materialEstado: m.materialEstado ? 'Activo' : 'Inactivo',
      }));

      const buffer = await this.exportacionService.exportToExcel({
        columns,
        data: exportData,
        filename: 'reporte-materiales',
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-materiales.xlsx"');
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
    'bodega-internas',
    'bodega-redes',
  )
  @ApiOperation({ summary: 'Export materials to PDF' })
  @ApiQuery({ name: 'filters', required: false, type: String })
  async exportToPdf(@Request() req, @Res() res: Response, @Query('filters') filters?: string) {
    try {
      const materiales = await this.materialesService.findAll(req.user);

      // Parsear filtros si existen
      let filteredData = materiales;
      if (filters) {
        try {
          const filterObj = JSON.parse(filters);
          if (filterObj.search) {
            const search = filterObj.search.toLowerCase();
            filteredData = filteredData.filter(
              (m: any) =>
                m.materialNombre?.toLowerCase().includes(search) ||
                m.materialCodigo?.toLowerCase().includes(search),
            );
          }
        } catch (e) {
          // Si hay error parseando filtros, usar todos los datos
        }
      }

      const columns = [
        { key: 'materialCodigo', label: 'Código' },
        { key: 'materialNombre', label: 'Nombre' },
        { key: 'materialDescripcion', label: 'Descripción' },
        { key: 'categoria', label: 'Categoría' },
        { key: 'proveedor', label: 'Proveedor' },
        { key: 'materialStock', label: 'Stock' },
        { key: 'materialPrecio', label: 'Precio' },
        { key: 'unidadMedida', label: 'Unidad de Medida' },
        { key: 'materialEstado', label: 'Estado' },
      ];

      const exportData = filteredData.map((m: any) => ({
        materialCodigo: m.materialCodigo || '-',
        materialNombre: m.materialNombre,
        materialDescripcion: m.materialDescripcion || '-',
        categoria: m.categoria?.categoriaNombre || 'Sin categoría',
        proveedor: m.proveedor?.proveedorNombre || 'Sin proveedor',
        materialStock: m.materialStock || 0,
        materialPrecio: m.materialPrecio || 0,
        unidadMedida:
          m.unidadMedida?.unidadMedidaNombre || m.unidadMedida?.unidadMedidaSimbolo || '-',
        materialEstado: m.materialEstado ? 'Activo' : 'Inactivo',
      }));

      const buffer = await this.exportacionService.exportToPdf({
        columns,
        data: exportData,
        filename: 'reporte-materiales',
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-materiales.pdf"');
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ message: 'Error al exportar a PDF', error: error.message });
    }
  }
}
