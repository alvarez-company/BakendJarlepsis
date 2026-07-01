import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  Ip,
} from '@nestjs/common';
import { NumerosMedidorService } from './numeros-medidor.service';
import { CreateNumeroMedidorDto, UpdateNumeroMedidorDto, EditarNumeroSerieDto } from './dto/create-numero-medidor.dto';
import { EstadoNumeroMedidor } from './numero-medidor.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ROLES_NUMEROS_MEDIDOR, ROLES_SUPERADMIN_GERENCIA, ROLES_AUDITORIA_INVENTARIO } from '../../common/constants/roles.constants';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Números de Medidor')
@ApiBearerAuth()
@Controller('numeros-medidor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ROLES_NUMEROS_MEDIDOR)
export class NumerosMedidorController {
  constructor(private readonly numerosMedidorService: NumerosMedidorService) {}

  @Post()
  create(@Body() createDto: CreateNumeroMedidorDto) {
    return this.numerosMedidorService.create(createDto);
  }

  @Post('crear-multiples')
  crearMultiples(
    @Body()
    body: {
      materialId: number;
      items: Array<{ numeroMedidor: string; bodegaId?: number }>;
      // Compatibilidad con clientes legacy (web) que envían { numerosMedidor: string[] }
      numerosMedidor?: string[];
    },
  ) {
    const itemsFromLegacy = Array.isArray(body.numerosMedidor)
      ? body.numerosMedidor.map((n) => ({ numeroMedidor: n }))
      : [];
    const items = Array.isArray(body.items) && body.items.length ? body.items : itemsFromLegacy;
    return this.numerosMedidorService.crearMultiples(body.materialId, items);
  }

  @Get()
  findAll(
    @Request() req: { user?: any },
    @Query('estado') estado?: EstadoNumeroMedidor,
    @Query() paginationDto?: PaginationDto,
  ) {
    if (estado) {
      return this.numerosMedidorService.findByEstado(estado, req.user);
    }
    return this.numerosMedidorService.findAll(paginationDto, req.user);
  }

  @Get('material/:materialId')
  findByMaterial(
    @Request() req: { user?: any },
    @Param('materialId') materialId: string,
    @Query('estado') estado?: EstadoNumeroMedidor,
  ) {
    return this.numerosMedidorService.findByMaterial(+materialId, estado, req.user);
  }

  @Get('usuario/:usuarioId')
  findByUsuario(@Param('usuarioId') usuarioId: string) {
    return this.numerosMedidorService.findByUsuario(+usuarioId);
  }

  @Get('instalacion/:instalacionId')
  findByInstalacion(@Param('instalacionId') instalacionId: string) {
    return this.numerosMedidorService.findByInstalacion(+instalacionId);
  }

  @Get('numero/:numeroMedidor')
  findByNumero(@Param('numeroMedidor') numeroMedidor: string) {
    return this.numerosMedidorService.findByNumero(numeroMedidor);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.numerosMedidorService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateNumeroMedidorDto) {
    return this.numerosMedidorService.update(+id, updateDto);
  }

  @Post('asignar-tecnico')
  asignarATecnico(
    @Body() body: { numerosMedidorIds: number[]; usuarioId: number; inventarioTecnicoId: number },
  ) {
    return this.numerosMedidorService.asignarATecnico(
      body.numerosMedidorIds,
      body.usuarioId,
      body.inventarioTecnicoId,
    );
  }

  @Post('asignar-instalacion')
  asignarAInstalacion(
    @Body()
    body: {
      numerosMedidorIds: number[];
      instalacionId: number;
      instalacionMaterialId: number;
    },
  ) {
    return this.numerosMedidorService.asignarAInstalacion(
      body.numerosMedidorIds,
      body.instalacionId,
      body.instalacionMaterialId,
    );
  }

  @Post('liberar-tecnico')
  liberarDeTecnico(@Body() body: { numerosMedidorIds: number[] }) {
    return this.numerosMedidorService.liberarDeTecnico(body.numerosMedidorIds);
  }

  @Post('liberar-instalacion')
  liberarDeInstalacion(@Body() body: { numerosMedidorIds: number[] }) {
    return this.numerosMedidorService.liberarDeInstalacion(body.numerosMedidorIds);
  }

  @Post('marcar-instalados/:instalacionId')
  marcarComoInstalados(@Param('instalacionId') instalacionId: string) {
    return this.numerosMedidorService.marcarComoInstalados(+instalacionId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.numerosMedidorService.remove(+id);
  }

  @Patch(':id/editar-numero-serie')
  @Roles(...ROLES_AUDITORIA_INVENTARIO)
  @ApiOperation({ summary: 'Edita el número de serie de un medidor y registra auditoría' })
  editarNumeroSerie(
    @Param('id') id: string,
    @Body() dto: EditarNumeroSerieDto,
    @Request() req: { user?: any },
    @Ip() ip: string,
  ) {
    return this.numerosMedidorService.editarNumeroSerie(+id, dto, req.user, ip);
  }

  @Get(':id/historial-cambios')
  @ApiOperation({ summary: 'Obtiene el historial de cambios de número de serie para un medidor' })
  obtenerHistorialCambios(@Param('id') id: string) {
    return this.numerosMedidorService.obtenerHistorialCambios(+id);
  }

  @Get('auditoria/historial')
  @Roles(...ROLES_AUDITORIA_INVENTARIO)
  @ApiOperation({ summary: 'Obtiene el historial general de cambios de números de medidor' })
  obtenerHistorialGeneral(
    @Query('materialId') materialId?: string,
    @Query('usuarioId') usuarioId?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.numerosMedidorService.obtenerHistorialCambiosGeneral({
      materialId: materialId ? +materialId : undefined,
      usuarioId: usuarioId ? +usuarioId : undefined,
      fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }
}
