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
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { ExportacionService } from '../exportacion/exportacion.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('clientes')
@ApiBearerAuth()
@Controller('clientes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientesController {
  constructor(
    private readonly clientesService: ClientesService,
    private readonly exportacionService: ExportacionService,
  ) {}

  @Post()
  @Roles(
    'superadmin',
    'admin',
    'admin-internas',
    'admin-redes',
    'tecnico',
    'soldador',
    'bodega-internas',
    'bodega-redes',
  )
  @ApiOperation({ summary: 'Create a new cliente' })
  create(@Body() createClienteDto: CreateClienteDto, @Request() req) {
    return this.clientesService.create(createClienteDto, req.user.usuarioId);
  }

  @Get()
  @Roles(
    'superadmin',
    'admin',
    'administrador',
    'admin-internas',
    'admin-redes',
    'almacenista',
    'tecnico',
    'soldador',
    'bodega-internas',
    'bodega-redes',
  )
  @ApiOperation({ summary: 'Get all clientes' })
  findAll() {
    return this.clientesService.findAll();
  }

  @Get(':id')
  @Roles(
    'superadmin',
    'admin',
    'administrador',
    'admin-internas',
    'admin-redes',
    'almacenista',
    'tecnico',
    'soldador',
    'bodega-internas',
    'bodega-redes',
  )
  @ApiOperation({ summary: 'Get a cliente by ID' })
  findOne(@Param('id') id: string) {
    return this.clientesService.findOne(+id);
  }

  @Patch(':id')
  @Roles(
    'superadmin',
    'admin',
    'admin-internas',
    'admin-redes',
    'tecnico',
    'soldador',
    'bodega-internas',
    'bodega-redes',
  )
  @ApiOperation({ summary: 'Update a cliente' })
  update(@Param('id') id: string, @Body() updateClienteDto: UpdateClienteDto) {
    return this.clientesService.update(+id, updateClienteDto);
  }

  @Delete(':id')
  @Roles('superadmin')
  @ApiOperation({ summary: 'Delete a cliente' })
  remove(@Param('id') id: string) {
    return this.clientesService.remove(+id);
  }

  @Get('export/excel')
  @Roles(
    'superadmin',
    'admin',
    'administrador',
    'admin-internas',
    'admin-redes',
    'almacenista',
    'tecnico',
    'soldador',
    'bodega-internas',
    'bodega-redes',
  )
  @ApiOperation({ summary: 'Export clients to Excel' })
  @ApiQuery({ name: 'filters', required: false, type: String })
  async exportToExcel(@Res() res: Response, @Query('filters') filters?: string) {
    try {
      const clientes = await this.clientesService.findAll();

      let filteredData = clientes;
      if (filters) {
        try {
          const filterObj = JSON.parse(filters);
          if (filterObj.search) {
            const search = filterObj.search.toLowerCase();
            filteredData = filteredData.filter((c: any) =>
              c.nombreUsuario?.toLowerCase().includes(search),
            );
          }
        } catch (_e) {
          // Ignorar errores de filtrado, continuar sin filtrar
        }
      }

      const columns = [
        { key: 'nombreUsuario', label: 'Nombre Usuario' },
        { key: 'clienteTelefono', label: 'Teléfono' },
        { key: 'clienteDireccion', label: 'Dirección' },
        { key: 'clienteEstado', label: 'Estado' },
      ];

      const exportData = filteredData.map((c: any) => ({
        nombreUsuario: c.nombreUsuario || '-',
        clienteTelefono: c.clienteTelefono || '-',
        clienteDireccion: c.clienteDireccion || '-',
        clienteEstado: c.clienteEstado || '-',
      }));

      const buffer = await this.exportacionService.exportToExcel({
        columns,
        data: exportData,
        filename: 'reporte-clientes',
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-clientes.xlsx"');
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ message: 'Error al exportar a Excel', error: error.message });
    }
  }

  @Get('export/pdf')
  @Roles(
    'superadmin',
    'admin',
    'administrador',
    'admin-internas',
    'admin-redes',
    'almacenista',
    'tecnico',
    'soldador',
    'bodega-internas',
    'bodega-redes',
  )
  @ApiOperation({ summary: 'Export clients to PDF' })
  @ApiQuery({ name: 'filters', required: false, type: String })
  async exportToPdf(@Res() res: Response, @Query('filters') filters?: string) {
    try {
      const clientes = await this.clientesService.findAll();

      let filteredData = clientes;
      if (filters) {
        try {
          const filterObj = JSON.parse(filters);
          if (filterObj.search) {
            const search = filterObj.search.toLowerCase();
            filteredData = filteredData.filter((c: any) =>
              c.nombreUsuario?.toLowerCase().includes(search),
            );
          }
        } catch (_e) {
          // Ignorar errores de filtrado, continuar sin filtrar
        }
      }

      const columns = [
        { key: 'nombreUsuario', label: 'Nombre Usuario' },
        { key: 'clienteTelefono', label: 'Teléfono' },
        { key: 'clienteDireccion', label: 'Dirección' },
        { key: 'clienteEstado', label: 'Estado' },
      ];

      const exportData = filteredData.map((c: any) => ({
        nombreUsuario: c.nombreUsuario || '-',
        clienteTelefono: c.clienteTelefono || '-',
        clienteDireccion: c.clienteDireccion || '-',
        clienteEstado: c.clienteEstado || '-',
      }));

      const buffer = await this.exportacionService.exportToPdf({
        columns,
        data: exportData,
        filename: 'reporte-clientes',
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-clientes.pdf"');
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ message: 'Error al exportar a PDF', error: error.message });
    }
  }
}
