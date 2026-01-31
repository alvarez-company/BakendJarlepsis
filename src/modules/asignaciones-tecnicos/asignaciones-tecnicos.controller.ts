import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Patch,
  UseGuards,
  Request,
  Res,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { AsignacionesTecnicosService } from './asignaciones-tecnicos.service';
import { CreateAsignacionTecnicoDto } from './dto/create-asignacion-tecnico.dto';
import { UpdateAsignacionTecnicoDto } from './dto/update-asignacion-tecnico.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ExportacionService } from '../exportacion/exportacion.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ImpersonationGuard } from '../auth/guards/impersonation.guard';

@ApiTags('asignaciones-tecnicos')
@Controller('asignaciones-tecnicos')
@UseGuards(JwtAuthGuard, ImpersonationGuard, RolesGuard)
@ApiBearerAuth()
export class AsignacionesTecnicosController {
  constructor(
    private readonly service: AsignacionesTecnicosService,
    private readonly exportacionService: ExportacionService,
  ) {}

  @Post()
  @Roles(
    'superadmin',
    'admin',
    'admin-internas',
    'admin-redes',
    'almacenista',
    'bodega-internas',
    'bodega-redes',
  )
  @ApiOperation({ summary: 'Crear una nueva asignación' })
  create(@Body() createDto: CreateAsignacionTecnicoDto, @Request() req) {
    return this.service.create(createDto, req.user);
  }

  @Get()
  @Roles(
    'superadmin',
    'admin',
    'admin-internas',
    'admin-redes',
    'almacenista',
    'bodega-internas',
    'bodega-redes',
  )
  @ApiOperation({ summary: 'Obtener todas las asignaciones' })
  findAll(@Query() paginationDto?: PaginationDto, @Request() req?: any) {
    return this.service.findAll(paginationDto, req?.user);
  }

  @Get(':id')
  @Roles(
    'superadmin',
    'admin',
    'admin-internas',
    'admin-redes',
    'almacenista',
    'bodega-internas',
    'bodega-redes',
  )
  @ApiOperation({ summary: 'Obtener una asignación por ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Get('usuario/:usuarioId')
  @Roles(
    'superadmin',
    'admin',
    'admin-internas',
    'admin-redes',
    'almacenista',
    'bodega-internas',
    'bodega-redes',
    'tecnico',
  )
  @ApiOperation({ summary: 'Obtener asignaciones de un técnico' })
  findByUsuario(@Param('usuarioId') usuarioId: string, @Request() req) {
    return this.service.findByUsuario(+usuarioId, req.user);
  }

  @Put(':id')
  @Roles('superadmin', 'admin', 'almacenista', 'bodega-internas', 'bodega-redes')
  @ApiOperation({ summary: 'Actualizar una asignación' })
  update(@Param('id') id: string, @Body() updateDto: UpdateAsignacionTecnicoDto, @Request() req) {
    return this.service.update(+id, updateDto, req.user);
  }

  @Patch(':id/aprobar')
  @Roles('superadmin', 'admin', 'almacenista')
  @ApiOperation({ summary: 'Aprobar una asignación' })
  aprobar(@Param('id') id: string, @Request() req) {
    return this.service.aprobar(+id, req.user);
  }

  @Patch(':id/rechazar')
  @Roles('superadmin', 'admin', 'almacenista')
  @ApiOperation({ summary: 'Rechazar una asignación' })
  rechazar(@Param('id') id: string, @Request() req) {
    return this.service.rechazar(+id, req.user);
  }

  @Delete(':id')
  @Roles('superadmin', 'admin', 'almacenista', 'bodega-internas', 'bodega-redes')
  @ApiOperation({ summary: 'Eliminar una asignación' })
  remove(@Param('id') id: string, @Request() req) {
    return this.service.remove(+id, req.user.usuarioId, req.user);
  }

  @Get('export/excel')
  @ApiOperation({ summary: 'Export assignments to Excel' })
  @ApiQuery({ name: 'dateStart', required: false, type: String })
  @ApiQuery({ name: 'dateEnd', required: false, type: String })
  async exportToExcel(
    @Res() res: Response,
    @Request() req,
    @Query('dateStart') dateStart?: string,
    @Query('dateEnd') dateEnd?: string,
  ) {
    try {
      const resultado = await this.service.findAll({ page: 1, limit: 10000 }, req?.user);
      const asignaciones = resultado.data;

      let filteredData = asignaciones;

      // Filtrar por fechas si se proporcionan
      if (dateStart || dateEnd) {
        const startDate = dateStart ? new Date(dateStart) : null;
        const endDate = dateEnd ? new Date(dateEnd) : null;
        if (endDate) endDate.setHours(23, 59, 59, 999);

        filteredData = filteredData.filter((a: any) => {
          const fecha = new Date(a.fechaCreacion);
          if (startDate && fecha < startDate) return false;
          if (endDate && fecha > endDate) return false;
          return true;
        });
      }

      const columns = [
        { key: 'asignacionCodigo', label: 'Código' },
        { key: 'usuario', label: 'Técnico' },
        { key: 'bodega', label: 'Bodega Origen' },
        { key: 'materialesCount', label: 'Cantidad Materiales' },
        { key: 'usuarioAsignador', label: 'Asignado Por' },
        { key: 'fechaCreacion', label: 'Fecha' },
      ];

      const exportData = filteredData.map((a: any) => ({
        asignacionCodigo: a.asignacionCodigo || '-',
        usuario:
          `${a.usuario?.usuarioNombre || ''} ${a.usuario?.usuarioApellido || ''}`.trim() || '-',
        bodega: a.inventario?.bodega?.bodegaNombre || '-',
        materialesCount: Array.isArray(a.materiales) ? a.materiales.length : 0,
        usuarioAsignador:
          `${a.usuarioAsignador?.usuarioNombre || ''} ${a.usuarioAsignador?.usuarioApellido || ''}`.trim() ||
          '-',
        fechaCreacion: a.fechaCreacion
          ? new Date(a.fechaCreacion).toLocaleDateString('es-CO')
          : '-',
      }));

      const buffer = await this.exportacionService.exportToExcel({
        columns,
        data: exportData,
        filename: 'reporte-asignaciones',
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-asignaciones.xlsx"');
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ message: 'Error al exportar a Excel', error: error.message });
    }
  }

  @Get('export/pdf')
  @ApiOperation({ summary: 'Export assignments to PDF' })
  @ApiQuery({ name: 'dateStart', required: false, type: String })
  @ApiQuery({ name: 'dateEnd', required: false, type: String })
  async exportToPdf(
    @Res() res: Response,
    @Request() req,
    @Query('dateStart') dateStart?: string,
    @Query('dateEnd') dateEnd?: string,
  ) {
    try {
      const resultado = await this.service.findAll({ page: 1, limit: 10000 }, req?.user);
      const asignaciones = resultado.data;

      let filteredData = asignaciones;

      // Filtrar por fechas si se proporcionan
      if (dateStart || dateEnd) {
        const startDate = dateStart ? new Date(dateStart) : null;
        const endDate = dateEnd ? new Date(dateEnd) : null;
        if (endDate) endDate.setHours(23, 59, 59, 999);

        filteredData = filteredData.filter((a: any) => {
          const fecha = new Date(a.fechaCreacion);
          if (startDate && fecha < startDate) return false;
          if (endDate && fecha > endDate) return false;
          return true;
        });
      }

      const columns = [
        { key: 'asignacionCodigo', label: 'Código' },
        { key: 'usuario', label: 'Técnico' },
        { key: 'bodega', label: 'Bodega Origen' },
        { key: 'materialesCount', label: 'Cantidad Materiales' },
        { key: 'usuarioAsignador', label: 'Asignado Por' },
        { key: 'fechaCreacion', label: 'Fecha' },
      ];

      const exportData = filteredData.map((a: any) => ({
        asignacionCodigo: a.asignacionCodigo || '-',
        usuario:
          `${a.usuario?.usuarioNombre || ''} ${a.usuario?.usuarioApellido || ''}`.trim() || '-',
        bodega: a.inventario?.bodega?.bodegaNombre || '-',
        materialesCount: Array.isArray(a.materiales) ? a.materiales.length : 0,
        usuarioAsignador:
          `${a.usuarioAsignador?.usuarioNombre || ''} ${a.usuarioAsignador?.usuarioApellido || ''}`.trim() ||
          '-',
        fechaCreacion: a.fechaCreacion
          ? new Date(a.fechaCreacion).toLocaleDateString('es-CO')
          : '-',
      }));

      const buffer = await this.exportacionService.exportToPdf({
        columns,
        data: exportData,
        filename: 'reporte-asignaciones',
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-asignaciones.pdf"');
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ message: 'Error al exportar a PDF', error: error.message });
    }
  }
}
