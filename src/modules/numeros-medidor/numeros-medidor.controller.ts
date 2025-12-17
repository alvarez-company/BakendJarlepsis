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
} from '@nestjs/common';
import { NumerosMedidorService } from './numeros-medidor.service';
import { CreateNumeroMedidorDto, UpdateNumeroMedidorDto, AsignarNumerosMedidorDto } from './dto/create-numero-medidor.dto';
import { EstadoNumeroMedidor } from './numero-medidor.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('numeros-medidor')
@UseGuards(JwtAuthGuard)
export class NumerosMedidorController {
  constructor(private readonly numerosMedidorService: NumerosMedidorService) {}

  @Post()
  create(@Body() createDto: CreateNumeroMedidorDto) {
    return this.numerosMedidorService.create(createDto);
  }

  @Post('crear-multiples')
  crearMultiples(@Body() body: { materialId: number; numerosMedidor: string[] }) {
    return this.numerosMedidorService.crearMultiples(body.materialId, body.numerosMedidor);
  }

  @Get()
  findAll(@Query('estado') estado?: EstadoNumeroMedidor, @Query() paginationDto?: PaginationDto) {
    if (estado) {
      return this.numerosMedidorService.findByEstado(estado);
    }
    return this.numerosMedidorService.findAll(paginationDto);
  }

  @Get('material/:materialId')
  findByMaterial(
    @Param('materialId') materialId: string,
    @Query('estado') estado?: EstadoNumeroMedidor
  ) {
    return this.numerosMedidorService.findByMaterial(+materialId, estado);
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
  asignarATecnico(@Body() body: { numerosMedidorIds: number[]; usuarioId: number; inventarioTecnicoId: number }) {
    return this.numerosMedidorService.asignarATecnico(
      body.numerosMedidorIds,
      body.usuarioId,
      body.inventarioTecnicoId
    );
  }

  @Post('asignar-instalacion')
  asignarAInstalacion(@Body() body: { numerosMedidorIds: number[]; instalacionId: number; instalacionMaterialId: number }) {
    return this.numerosMedidorService.asignarAInstalacion(
      body.numerosMedidorIds,
      body.instalacionId,
      body.instalacionMaterialId
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
