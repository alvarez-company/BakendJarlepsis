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
} from '@nestjs/common';
import { NumerosMedidorService } from './numeros-medidor.service';
import { CreateNumeroMedidorDto, UpdateNumeroMedidorDto } from './dto/create-numero-medidor.dto';
import { EstadoNumeroMedidor } from './numero-medidor.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

const ROLES_NUMEROS_MEDIDOR = [
  'superadmin',
  'gerencia',
  'admin',
  'admin-internas',
  'admin-redes',
  'almacenista',
  'tecnico',
  'soldador',
  'bodega-internas',
  'bodega-redes',
] as const;

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
    },
  ) {
    const items = body.items ?? [];
    return this.numerosMedidorService.crearMultiples(body.materialId, items);
  }

  @Get()
  findAll(
    @Query('estado') estado?: EstadoNumeroMedidor,
    @Query() paginationDto?: PaginationDto,
    @Request() req?: { user?: any },
  ) {
    if (estado) {
      return this.numerosMedidorService.findByEstado(estado, req?.user);
    }
    return this.numerosMedidorService.findAll(paginationDto, req?.user);
  }

  @Get('material/:materialId')
  findByMaterial(
    @Param('materialId') materialId: string,
    @Query('estado') estado?: EstadoNumeroMedidor,
    @Request() req?: { user?: any },
  ) {
    return this.numerosMedidorService.findByMaterial(+materialId, estado, req?.user);
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
}
