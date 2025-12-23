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
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { InstalacionesService } from './instalaciones.service';
import { CreateInstalacionDto } from './dto/create-instalacion.dto';
import { UpdateInstalacionDto } from './dto/update-instalacion.dto';
import { UpdateEstadoDto } from './dto/update-estado.dto';
import { ExportacionService } from '../exportacion/exportacion.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('instalaciones')
@ApiBearerAuth()
@Controller('instalaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InstalacionesController {
  constructor(
    private readonly instalacionesService: InstalacionesService,
    private readonly exportacionService: ExportacionService,
  ) {}

  @Post()
  @Roles('superadmin', 'admin', 'tecnico', 'bodega-internas', 'bodega-redes')
  @ApiOperation({ summary: 'Create a new instalacion' })
  create(@Body() createInstalacionDto: CreateInstalacionDto, @Request() req) {
    return this.instalacionesService.create(createInstalacionDto, req.user.usuarioId, req.user);
  }

  @Get()
  @Roles('superadmin', 'admin', 'administrador', 'almacenista', 'tecnico', 'soldador', 'bodega-internas', 'bodega-redes', 'instalaciones')
  @ApiOperation({ summary: 'Get all instalaciones' })
  async findAll(@Request() req) {
    try {
      const result = await this.instalacionesService.findAll(req.user);
      return result;
    } catch (error) {
      console.error('[InstalacionesController.findAll] Error en findAll:', error);
      console.error('[InstalacionesController.findAll] Stack trace:', error.stack);
      throw error;
    }
  }

  @Get(':id')
  @Roles('superadmin', 'admin', 'administrador', 'almacenista', 'tecnico', 'soldador', 'bodega-internas', 'bodega-redes')
  @ApiOperation({ summary: 'Get an instalacion by ID' })
  findOne(@Param('id') id: string) {
    const instalacionId = parseInt(id, 10);
    if (isNaN(instalacionId)) {
      throw new NotFoundException(`ID de instalación inválido: ${id}`);
    }
    return this.instalacionesService.findOne(instalacionId);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin', 'tecnico', 'bodega-internas', 'bodega-redes')
  @ApiOperation({ summary: 'Update an instalacion' })
  update(@Param('id') id: string, @Body() updateInstalacionDto: UpdateInstalacionDto, @Request() req) {
    return this.instalacionesService.update(+id, updateInstalacionDto, req.user.usuarioId, req.user);
  }

  @Delete(':id')
  @Roles('superadmin', 'bodega-internas', 'bodega-redes')
  @ApiOperation({ summary: 'Delete an instalacion' })
  remove(@Param('id') id: string, @Request() req) {
    return this.instalacionesService.remove(+id, req.user.usuarioId, req.user);
  }

  @Post(':id/actualizar-estado')
  @Roles('superadmin', 'admin', 'tecnico', 'bodega-internas', 'bodega-redes')
  @ApiOperation({ summary: 'Update instalacion status' })
  actualizarEstado(@Param('id') id: string, @Body() updateEstadoDto: UpdateEstadoDto, @Request() req) {
    return this.instalacionesService.actualizarEstado(+id, updateEstadoDto.estado, req.user.usuarioId, req.user);
  }

  @Get('export/excel')
  @Roles('superadmin', 'admin', 'tecnico', 'instalaciones')
  @ApiOperation({ summary: 'Export installations to Excel' })
  @ApiQuery({ name: 'filters', required: false, type: String })
  @ApiQuery({ name: 'dateStart', required: false, type: String })
  @ApiQuery({ name: 'dateEnd', required: false, type: String })
  async exportToExcel(@Request() req, @Res() res: Response, @Query('filters') filters?: string, @Query('dateStart') dateStart?: string, @Query('dateEnd') dateEnd?: string) {
    try {
      const instalaciones = await this.instalacionesService.findAll(req.user);
      
      let filteredData = instalaciones;
      
      // Filtrar por fechas si se proporcionan
      if (dateStart || dateEnd) {
        const startDate = dateStart ? new Date(dateStart) : null;
        const endDate = dateEnd ? new Date(dateEnd) : null;
        if (endDate) endDate.setHours(23, 59, 59, 999);
        
        filteredData = filteredData.filter((i: any) => {
          const fecha = new Date(i.fechaCreacion || i.instalacionFechaCreacion || i.instalacionFechaInicio);
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
            filteredData = filteredData.filter((i: any) =>
              i.instalacionIdentificadorUnico?.toLowerCase().includes(search) ||
              i.cliente?.nombreUsuario?.toLowerCase().includes(search)
            );
          }
        } catch (e) {}
      }

      const columns = [
        { key: 'instalacionId', label: 'ID' },
        { key: 'identificadorUnico', label: 'Identificador Único' },
        { key: 'instalacionCodigo', label: 'Código Instalación' },
        { key: 'tipoInstalacion', label: 'Tipo Instalación' },
        { key: 'cliente', label: 'Cliente' },
        { key: 'clienteTelefono', label: 'Teléfono Cliente' },
        { key: 'clienteDireccion', label: 'Dirección Cliente' },
        { key: 'instalacionMedidorNumero', label: 'Número Medidor' },
        { key: 'instalacionSelloNumero', label: 'Número Sello' },
        { key: 'instalacionSelloRegulador', label: 'Sello Regulador' },
        { key: 'instalacionFecha', label: 'Fecha Instalación' },
        { key: 'estado', label: 'Estado' },
        { key: 'fechaAsignacion', label: 'Fecha Asignación' },
        { key: 'fechaConstruccion', label: 'Fecha Construcción' },
        { key: 'fechaCertificacion', label: 'Fecha Certificación' },
        { key: 'fechaFinalizacion', label: 'Fecha Finalización' },
        { key: 'fechaNovedad', label: 'Fecha Novedad' },
        { key: 'fechaAnulacion', label: 'Fecha Anulación' },
        { key: 'usuariosAsignados', label: 'Usuarios Asignados' },
        { key: 'bodega', label: 'Bodega' },
        { key: 'usuarioRegistrador', label: 'Usuario Registrador' },
        { key: 'instalacionObservaciones', label: 'Observaciones' },
        { key: 'observacionesTecnico', label: 'Observaciones Técnico' },
        { key: 'fechaCreacion', label: 'Fecha Creación' },
        { key: 'fechaActualizacion', label: 'Fecha Actualización' },
      ];

      const exportData = filteredData.map((i: any) => {
        // Formatear usuarios asignados
        const usuariosAsignadosStr = i.usuariosAsignados && Array.isArray(i.usuariosAsignados) && i.usuariosAsignados.length > 0
          ? i.usuariosAsignados.map((ua: any) => {
              const usuario = ua.usuario;
              if (usuario) {
                return `${usuario.usuarioNombre} ${usuario.usuarioApellido}${ua.rolEnInstalacion ? ` (${ua.rolEnInstalacion})` : ''}`;
              }
              return `Usuario ID: ${ua.usuarioId}`;
            }).join('; ')
          : 'Sin asignar';

        // Formatear materiales instalados si existen
        let materialesStr = '-';
        if (i.materialesInstalados) {
          try {
            const materiales = typeof i.materialesInstalados === 'string' 
              ? JSON.parse(i.materialesInstalados) 
              : i.materialesInstalados;
            if (Array.isArray(materiales) && materiales.length > 0) {
              materialesStr = materiales.map((m: any) => 
                `${m.nombre || m.materialNombre || 'Material'} (${m.cantidad || 0})`
              ).join('; ');
            }
          } catch (e) {
            materialesStr = 'Error al parsear';
          }
        }

        return {
          instalacionId: i.instalacionId || '-',
          identificadorUnico: i.identificadorUnico || '-',
          instalacionCodigo: i.instalacionCodigo || '-',
          tipoInstalacion: i.tipoInstalacion?.tipoInstalacionNombre || '-',
          cliente: i.cliente?.nombreUsuario || 'Sin cliente',
          clienteTelefono: i.cliente?.clienteTelefono || '-',
          clienteDireccion: i.cliente?.clienteDireccion || '-',
          instalacionMedidorNumero: i.instalacionMedidorNumero || '-',
          instalacionSelloNumero: i.instalacionSelloNumero || '-',
          instalacionSelloRegulador: i.instalacionSelloRegulador || '-',
          instalacionFecha: i.instalacionFecha ? new Date(i.instalacionFecha).toLocaleDateString('es-CO') : '-',
          estado: i.estado || '-',
          fechaAsignacion: i.fechaAsignacion ? new Date(i.fechaAsignacion).toLocaleString('es-CO') : '-',
          fechaConstruccion: i.fechaConstruccion ? new Date(i.fechaConstruccion).toLocaleString('es-CO') : '-',
          fechaCertificacion: i.fechaCertificacion ? new Date(i.fechaCertificacion).toLocaleString('es-CO') : '-',
          fechaFinalizacion: i.fechaFinalizacion ? new Date(i.fechaFinalizacion).toLocaleString('es-CO') : '-',
          fechaNovedad: i.fechaNovedad ? new Date(i.fechaNovedad).toLocaleString('es-CO') : '-',
          fechaAnulacion: i.fechaAnulacion ? new Date(i.fechaAnulacion).toLocaleString('es-CO') : '-',
          usuariosAsignados: usuariosAsignadosStr,
          bodega: i.bodega?.bodegaNombre || '-',
          usuarioRegistrador: i.usuarioRegistrador 
            ? `${i.usuarioRegistrador.usuarioNombre} ${i.usuarioRegistrador.usuarioApellido}` 
            : '-',
          instalacionObservaciones: i.instalacionObservaciones || '-',
          observacionesTecnico: i.observacionesTecnico || '-',
          fechaCreacion: i.fechaCreacion ? new Date(i.fechaCreacion).toLocaleString('es-CO') : '-',
          fechaActualizacion: i.fechaActualizacion ? new Date(i.fechaActualizacion).toLocaleString('es-CO') : '-',
        };
      });

      const buffer = await this.exportacionService.exportToExcel({
        columns,
        data: exportData,
        filename: 'reporte-instalaciones',
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-instalaciones.xlsx"');
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ message: 'Error al exportar a Excel', error: error.message });
    }
  }

  @Get('export/pdf')
  @Roles('superadmin', 'admin', 'tecnico', 'instalaciones')
  @ApiOperation({ summary: 'Export installations to PDF' })
  @ApiQuery({ name: 'filters', required: false, type: String })
  @ApiQuery({ name: 'dateStart', required: false, type: String })
  @ApiQuery({ name: 'dateEnd', required: false, type: String })
  async exportToPdf(@Request() req, @Res() res: Response, @Query('filters') filters?: string, @Query('dateStart') dateStart?: string, @Query('dateEnd') dateEnd?: string) {
    try {
      const instalaciones = await this.instalacionesService.findAll(req.user);
      
      let filteredData = instalaciones;
      
      // Filtrar por fechas si se proporcionan
      if (dateStart || dateEnd) {
        const startDate = dateStart ? new Date(dateStart) : null;
        const endDate = dateEnd ? new Date(dateEnd) : null;
        if (endDate) endDate.setHours(23, 59, 59, 999);
        
        filteredData = filteredData.filter((i: any) => {
          const fecha = new Date(i.fechaCreacion || i.instalacionFechaCreacion || i.instalacionFechaInicio);
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
            filteredData = filteredData.filter((i: any) =>
              i.instalacionIdentificadorUnico?.toLowerCase().includes(search) ||
              i.cliente?.nombreUsuario?.toLowerCase().includes(search)
            );
          }
        } catch (e) {}
      }

      const columns = [
        { key: 'instalacionId', label: 'ID' },
        { key: 'identificadorUnico', label: 'Identificador Único' },
        { key: 'instalacionCodigo', label: 'Código Instalación' },
        { key: 'tipoInstalacion', label: 'Tipo Instalación' },
        { key: 'cliente', label: 'Cliente' },
        { key: 'clienteTelefono', label: 'Teléfono Cliente' },
        { key: 'clienteDireccion', label: 'Dirección Cliente' },
        { key: 'instalacionMedidorNumero', label: 'Número Medidor' },
        { key: 'instalacionSelloNumero', label: 'Número Sello' },
        { key: 'instalacionSelloRegulador', label: 'Sello Regulador' },
        { key: 'instalacionFecha', label: 'Fecha Instalación' },
        { key: 'estado', label: 'Estado' },
        { key: 'fechaAsignacion', label: 'Fecha Asignación' },
        { key: 'fechaConstruccion', label: 'Fecha Construcción' },
        { key: 'fechaCertificacion', label: 'Fecha Certificación' },
        { key: 'fechaFinalizacion', label: 'Fecha Finalización' },
        { key: 'fechaNovedad', label: 'Fecha Novedad' },
        { key: 'fechaAnulacion', label: 'Fecha Anulación' },
        { key: 'usuariosAsignados', label: 'Usuarios Asignados' },
        { key: 'bodega', label: 'Bodega' },
        { key: 'usuarioRegistrador', label: 'Usuario Registrador' },
        { key: 'instalacionObservaciones', label: 'Observaciones' },
        { key: 'observacionesTecnico', label: 'Observaciones Técnico' },
        { key: 'fechaCreacion', label: 'Fecha Creación' },
        { key: 'fechaActualizacion', label: 'Fecha Actualización' },
      ];

      const exportData = filteredData.map((i: any) => {
        // Formatear usuarios asignados
        const usuariosAsignadosStr = i.usuariosAsignados && Array.isArray(i.usuariosAsignados) && i.usuariosAsignados.length > 0
          ? i.usuariosAsignados.map((ua: any) => {
              const usuario = ua.usuario;
              if (usuario) {
                return `${usuario.usuarioNombre} ${usuario.usuarioApellido}${ua.rolEnInstalacion ? ` (${ua.rolEnInstalacion})` : ''}`;
              }
              return `Usuario ID: ${ua.usuarioId}`;
            }).join('; ')
          : 'Sin asignar';

        // Formatear materiales instalados si existen
        let materialesStr = '-';
        if (i.materialesInstalados) {
          try {
            const materiales = typeof i.materialesInstalados === 'string' 
              ? JSON.parse(i.materialesInstalados) 
              : i.materialesInstalados;
            if (Array.isArray(materiales) && materiales.length > 0) {
              materialesStr = materiales.map((m: any) => 
                `${m.nombre || m.materialNombre || 'Material'} (${m.cantidad || 0})`
              ).join('; ');
            }
          } catch (e) {
            materialesStr = 'Error al parsear';
          }
        }

        return {
          instalacionId: i.instalacionId || '-',
          identificadorUnico: i.identificadorUnico || '-',
          instalacionCodigo: i.instalacionCodigo || '-',
          tipoInstalacion: i.tipoInstalacion?.tipoInstalacionNombre || '-',
          cliente: i.cliente?.nombreUsuario || 'Sin cliente',
          clienteTelefono: i.cliente?.clienteTelefono || '-',
          clienteDireccion: i.cliente?.clienteDireccion || '-',
          instalacionMedidorNumero: i.instalacionMedidorNumero || '-',
          instalacionSelloNumero: i.instalacionSelloNumero || '-',
          instalacionSelloRegulador: i.instalacionSelloRegulador || '-',
          instalacionFecha: i.instalacionFecha ? new Date(i.instalacionFecha).toLocaleDateString('es-CO') : '-',
          estado: i.estado || '-',
          fechaAsignacion: i.fechaAsignacion ? new Date(i.fechaAsignacion).toLocaleString('es-CO') : '-',
          fechaConstruccion: i.fechaConstruccion ? new Date(i.fechaConstruccion).toLocaleString('es-CO') : '-',
          fechaCertificacion: i.fechaCertificacion ? new Date(i.fechaCertificacion).toLocaleString('es-CO') : '-',
          fechaFinalizacion: i.fechaFinalizacion ? new Date(i.fechaFinalizacion).toLocaleString('es-CO') : '-',
          fechaNovedad: i.fechaNovedad ? new Date(i.fechaNovedad).toLocaleString('es-CO') : '-',
          fechaAnulacion: i.fechaAnulacion ? new Date(i.fechaAnulacion).toLocaleString('es-CO') : '-',
          usuariosAsignados: usuariosAsignadosStr,
          bodega: i.bodega?.bodegaNombre || '-',
          usuarioRegistrador: i.usuarioRegistrador 
            ? `${i.usuarioRegistrador.usuarioNombre} ${i.usuarioRegistrador.usuarioApellido}` 
            : '-',
          instalacionObservaciones: i.instalacionObservaciones || '-',
          observacionesTecnico: i.observacionesTecnico || '-',
          fechaCreacion: i.fechaCreacion ? new Date(i.fechaCreacion).toLocaleString('es-CO') : '-',
          fechaActualizacion: i.fechaActualizacion ? new Date(i.fechaActualizacion).toLocaleString('es-CO') : '-',
        };
      });

      const buffer = await this.exportacionService.exportToPdf({
        columns,
        data: exportData,
        filename: 'reporte-instalaciones',
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-instalaciones.pdf"');
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ message: 'Error al exportar a PDF', error: error.message });
    }
  }
}
