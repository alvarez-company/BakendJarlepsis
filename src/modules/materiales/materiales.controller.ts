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
import { ImpersonationGuard } from '../auth/guards/impersonation.guard';
import {
  ROLES_ALMACENISTA,
  ROLES_VER_MATERIALES_INVENTARIO,
  ROLES_VER_SEDES,
  ROLES_SUPERADMIN_GERENCIA,
  ROLES_ASIGNAR_MATERIAL,
} from '../../common/constants/roles.constants';

@ApiTags('materiales')
@ApiBearerAuth()
@Controller('materiales')
@UseGuards(JwtAuthGuard, ImpersonationGuard, RolesGuard)
export class MaterialesController {
  constructor(
    private readonly materialesService: MaterialesService,
    private readonly exportacionService: ExportacionService,
    private readonly numerosMedidorService: NumerosMedidorService,
  ) {}

  @Post()
  @Roles(...ROLES_ALMACENISTA)
  @ApiOperation({ summary: 'Create a new material' })
  create(@Body() createMaterialDto: CreateMaterialDto, @Request() req) {
    return this.materialesService.create(createMaterialDto, req.user.usuarioId);
  }

  @Get('stock-por-sede')
  @Roles(...ROLES_VER_SEDES)
  @ApiOperation({ summary: 'Stock acumulado por centro operativo (bodegas + técnicos)' })
  getStockPorSede(@Request() req) {
    return this.materialesService.getStockAcumuladoPorSede(req.user);
  }

  @Get()
  @Roles(...ROLES_VER_MATERIALES_INVENTARIO)
  @ApiOperation({ summary: 'Get all materiales' })
  @ApiQuery({ name: 'vistaCentroOperativo', required: false, type: Number })
  findAll(
    @Request() req,
    @Query('vistaCentroOperativo') vistaCentroOperativo?: string,
  ) {
    const raw = vistaCentroOperativo?.trim();
    const id = raw ? Number(raw) : NaN;
    const vista = Number.isFinite(id) && id > 0 ? id : undefined;
    return this.materialesService.findAll(req.user, vista);
  }

  @Get(':id')
  @Roles(...ROLES_VER_MATERIALES_INVENTARIO)
  @ApiOperation({ summary: 'Get a material by ID' })
  findOne(@Param('id') id: string, @Request() req?: any) {
    return this.materialesService.findOne(+id, req?.user);
  }

  @Patch(':id')
  @Roles(...ROLES_ALMACENISTA)
  @ApiOperation({ summary: 'Update a material' })
  update(@Param('id') id: string, @Body() updateMaterialDto: UpdateMaterialDto, @Request() req) {
    return this.materialesService.update(+id, updateMaterialDto, req.user.usuarioId);
  }

  @Post(':id/ajustar-stock')
  @Roles(...ROLES_ALMACENISTA)
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
  @Roles(...ROLES_ALMACENISTA)
  @ApiOperation({ summary: 'Duplicar un material' })
  duplicate(@Param('id') id: string, @Request() req) {
    return this.materialesService.duplicate(+id, req.user.usuarioId);
  }

  @Post(':id/asignar-numeros-medidor')
  @Roles(...ROLES_ASIGNAR_MATERIAL)
  @ApiOperation({
    summary:
      'Asignar números de medidor a un material. Cada item puede incluir bodegaId; si no se asigna bodega, el medidor queda en el centro operativo.',
  })
  async asignarNumerosMedidor(
    @Param('id') id: string,
    @Body() body: { items: Array<{ numeroMedidor: string; bodegaId?: number }> },
  ) {
    return this.numerosMedidorService.crearMultiples(+id, body.items ?? []);
  }

  @Delete(':id')
  @Roles(...ROLES_SUPERADMIN_GERENCIA)
  @ApiOperation({ summary: 'Delete a material' })
  remove(@Param('id') id: string) {
    return this.materialesService.remove(+id);
  }

  @Get('export/excel')
  @Roles(...ROLES_VER_MATERIALES_INVENTARIO)
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
  @Roles(...ROLES_VER_MATERIALES_INVENTARIO)
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
