import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Traslado, EstadoTraslado } from './traslado.entity';
import { CreateTrasladoDto } from './dto/create-traslado.dto';
import { UpdateTrasladoDto } from './dto/update-traslado.dto';
import { MovimientosService } from '../movimientos/movimientos.service';
import { MaterialesService } from '../materiales/materiales.service';
import { InventariosService } from '../inventarios/inventarios.service';
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
    @Inject(forwardRef(() => InventariosService))
    private inventariosService: InventariosService,
  ) {}

  async create(createTrasladoDto: CreateTrasladoDto): Promise<Traslado[]> {
    // Validar que origen y destino sean diferentes
    if (createTrasladoDto.bodegaOrigenId === createTrasladoDto.bodegaDestinoId) {
      throw new BadRequestException('La bodega origen y destino no pueden ser la misma');
    }

    // Generar código único para agrupar los traslados
    const trasladoCodigo = createTrasladoDto.trasladoCodigo || 
      `TRAS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const trasladosCreados: Traslado[] = [];

    // Procesar cada material del array
    for (const materialDto of createTrasladoDto.materiales) {
      // Verificar que el material existe
      await this.materialesService.findOne(materialDto.materialId);

      // Crear el traslado con estado pendiente
      const traslado = this.trasladosRepository.create({
        materialId: materialDto.materialId,
        bodegaOrigenId: createTrasladoDto.bodegaOrigenId,
        bodegaDestinoId: createTrasladoDto.bodegaDestinoId,
        trasladoCantidad: materialDto.trasladoCantidad,
        trasladoObservaciones: createTrasladoDto.trasladoObservaciones,
        usuarioId: createTrasladoDto.usuarioId,
        trasladoCodigo: trasladoCodigo,
        trasladoEstado: EstadoTraslado.PENDIENTE,
      });
      const trasladoGuardado = await this.trasladosRepository.save(traslado);
      trasladosCreados.push(trasladoGuardado);
    }

    return trasladosCreados;
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

  async findByCodigo(codigo: string): Promise<Traslado[]> {
    const traslados = await this.trasladosRepository.find({
      where: { trasladoCodigo: codigo },
      relations: ['material', 'bodegaOrigen', 'bodegaDestino', 'usuario'],
    });
    return traslados;
  }

  async completarTraslado(id: number): Promise<Traslado> {
    const traslado = await this.findOne(id);

    if (traslado.trasladoEstado !== EstadoTraslado.PENDIENTE && 
        traslado.trasladoEstado !== EstadoTraslado.EN_TRANSITO) {
      throw new BadRequestException('Solo se pueden completar traslados pendientes o en tránsito');
    }

    // Si tiene código, completar todos los traslados del mismo grupo
    if (traslado.trasladoCodigo) {
      const trasladosGrupo = await this.trasladosRepository.find({
        where: { trasladoCodigo: traslado.trasladoCodigo },
      });

      // Obtener inventarios de bodegas
      const inventarioOrigen = await this.inventariosService.findByBodega(traslado.bodegaOrigenId);
      const inventarioDestino = await this.inventariosService.findByBodega(traslado.bodegaDestinoId);

      if (!inventarioOrigen || !inventarioDestino) {
        throw new BadRequestException('No se encontraron inventarios activos para las bodegas seleccionadas.');
      }

      // Procesar cada traslado del grupo
      for (const t of trasladosGrupo) {
        // Verificar que el material existe
        await this.materialesService.findOne(t.materialId);

        // Crear movimiento de salida en bodega origen
        await this.movimientosService.create({
          materiales: [{
            materialId: t.materialId,
            movimientoCantidad: t.trasladoCantidad,
          }],
          movimientoTipo: TipoMovimiento.SALIDA,
          usuarioId: t.usuarioId,
          inventarioId: inventarioOrigen.inventarioId,
          movimientoObservaciones: `Traslado a bodega ${t.bodegaDestinoId}`,    
          movimientoCodigo: traslado.trasladoCodigo,
        });

        // Crear movimiento de entrada en bodega destino con inventarioId       
        await this.movimientosService.create({
          materiales: [{
            materialId: t.materialId,
            movimientoCantidad: t.trasladoCantidad,
          }],
          movimientoTipo: TipoMovimiento.ENTRADA,
          usuarioId: t.usuarioId,
          inventarioId: inventarioDestino.inventarioId,
          movimientoObservaciones: `Traslado desde bodega ${t.bodegaOrigenId}`, 
          movimientoCodigo: traslado.trasladoCodigo,
        });

        // Actualizar estado del traslado
        t.trasladoEstado = EstadoTraslado.COMPLETADO;
        await this.trasladosRepository.save(t);
      }

      return traslado;
    }

    // Si no tiene código, procesar como traslado individual
    // Verificar que el material existe
    await this.materialesService.findOne(traslado.materialId);

    // Obtener inventarios de bodegas
    const inventarioOrigen = await this.inventariosService.findByBodega(traslado.bodegaOrigenId);
    const inventarioDestino = await this.inventariosService.findByBodega(traslado.bodegaDestinoId);

    if (!inventarioOrigen || !inventarioDestino) {
      throw new BadRequestException('No se encontraron inventarios activos para las bodegas seleccionadas.');
    }

    // Crear movimiento de salida en bodega origen
    await this.movimientosService.create({
      materiales: [{
        materialId: traslado.materialId,
        movimientoCantidad: traslado.trasladoCantidad,
      }],
      movimientoTipo: TipoMovimiento.SALIDA,
      usuarioId: traslado.usuarioId,
      inventarioId: inventarioOrigen.inventarioId,
      movimientoObservaciones: `Traslado a bodega ${traslado.bodegaDestinoId}`, 
      movimientoCodigo: traslado.trasladoCodigo,
    });

    // Crear movimiento de entrada en bodega destino con inventarioId
    await this.movimientosService.create({
      materiales: [{
        materialId: traslado.materialId,
        movimientoCantidad: traslado.trasladoCantidad,
      }],
      movimientoTipo: TipoMovimiento.ENTRADA,
      usuarioId: traslado.usuarioId,
      inventarioId: inventarioDestino.inventarioId,
      movimientoObservaciones: `Traslado desde bodega ${traslado.bodegaOrigenId}`,                                                                             
      movimientoCodigo: traslado.trasladoCodigo,
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

