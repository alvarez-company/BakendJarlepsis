import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Traslado, EstadoTraslado } from './traslado.entity';
import { CreateTrasladoDto } from './dto/create-traslado.dto';
import { UpdateTrasladoDto } from './dto/update-traslado.dto';
import { MovimientosService } from '../movimientos/movimientos.service';
import { MaterialesService } from '../materiales/materiales.service';
import { TipoMovimiento } from '../movimientos/movimiento-inventario.entity';

@Injectable()
export class TrasladosService {
  constructor(
    @InjectRepository(Traslado)
    private trasladosRepository: Repository<Traslado>,
    @Inject(forwardRef(() => MovimientosService))
    private movimientosService: MovimientosService,
    @Inject(forwardRef(() => MaterialesService))
    private materialesService: MaterialesService,
  ) {}

  async create(createTrasladoDto: CreateTrasladoDto): Promise<Traslado> {
    // Validar que origen y destino sean diferentes
    if (createTrasladoDto.bodegaOrigenId === createTrasladoDto.bodegaDestinoId) {
      throw new BadRequestException('La bodega origen y destino no pueden ser la misma');
    }

    // Verificar que el material existe
    await this.materialesService.findOne(createTrasladoDto.materialId);

    // Crear el traslado con estado pendiente
    const traslado = this.trasladosRepository.create({
      ...createTrasladoDto,
      trasladoEstado: EstadoTraslado.PENDIENTE,
    });
    return this.trasladosRepository.save(traslado);
  }

  async findAll(): Promise<Traslado[]> {
    return this.trasladosRepository.find({
      relations: ['material', 'bodegaOrigen', 'bodegaDestino', 'usuario'],
    });
  }

  async findOne(id: number): Promise<Traslado> {
    const traslado = await this.trasladosRepository.findOne({
      where: { trasladoId: id },
      relations: ['material', 'bodegaOrigen', 'bodegaDestino', 'usuario'],
    });
    if (!traslado) {
      throw new NotFoundException(`Traslado con ID ${id} no encontrado`);
    }
    return traslado;
  }

  async completarTraslado(id: number): Promise<Traslado> {
    const traslado = await this.findOne(id);

    if (traslado.trasladoEstado !== EstadoTraslado.PENDIENTE && 
        traslado.trasladoEstado !== EstadoTraslado.EN_TRANSITO) {
      throw new BadRequestException('Solo se pueden completar traslados pendientes o en tránsito');
    }

    // Verificar que el material existe y obtener información de inventarios
    const material = await this.materialesService.findOne(traslado.materialId);

    // Crear movimiento de salida en bodega origen
    await this.movimientosService.create({
      materialId: traslado.materialId,
      movimientoTipo: TipoMovimiento.SALIDA,
      movimientoCantidad: traslado.trasladoCantidad,
      usuarioId: traslado.usuarioId,
      movimientoObservaciones: `Traslado a bodega ${traslado.bodegaDestinoId}`,
    });

    // Crear movimiento de entrada en bodega destino
    await this.movimientosService.create({
      materialId: traslado.materialId,
      movimientoTipo: TipoMovimiento.ENTRADA,
      movimientoCantidad: traslado.trasladoCantidad,
      usuarioId: traslado.usuarioId,
      movimientoObservaciones: `Traslado desde bodega ${traslado.bodegaOrigenId}`,
    });

    // Actualizar estado del traslado
    traslado.trasladoEstado = EstadoTraslado.COMPLETADO;
    return this.trasladosRepository.save(traslado);
  }

  async update(id: number, updateTrasladoDto: UpdateTrasladoDto): Promise<Traslado> {
    const traslado = await this.findOne(id);
    Object.assign(traslado, updateTrasladoDto);
    return this.trasladosRepository.save(traslado);
  }

  async cancelarTraslado(id: number): Promise<Traslado> {
    const traslado = await this.findOne(id);
    
    if (traslado.trasladoEstado === EstadoTraslado.COMPLETADO) {
      throw new BadRequestException('No se puede cancelar un traslado completado');
    }

    traslado.trasladoEstado = EstadoTraslado.CANCELADO;
    return this.trasladosRepository.save(traslado);
  }

  async remove(id: number): Promise<void> {
    const traslado = await this.findOne(id);
    await this.trasladosRepository.remove(traslado);
  }
}

