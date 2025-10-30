import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MovimientoInventario, TipoMovimiento } from './movimiento-inventario.entity';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { MaterialesService } from '../materiales/materiales.service';

@Injectable()
export class MovimientosService {
  constructor(
    @InjectRepository(MovimientoInventario)
    private movimientosRepository: Repository<MovimientoInventario>,
    @Inject(forwardRef(() => MaterialesService))
    private materialesService: MaterialesService,
  ) {}

  async create(createMovimientoDto: CreateMovimientoDto): Promise<MovimientoInventario> {
    // Verificar que el material existe
    const material = await this.materialesService.findOne(createMovimientoDto.materialId);

    // Crear el movimiento
    const movimiento = this.movimientosRepository.create(createMovimientoDto);
    const movimientoGuardado = await this.movimientosRepository.save(movimiento);

    // Ajustar stock según el tipo de movimiento
    await this.ajustarStockMovimiento(
      createMovimientoDto.materialId,
      createMovimientoDto.movimientoTipo,
      createMovimientoDto.movimientoCantidad,
    );

    return movimientoGuardado;
  }

  private async ajustarStockMovimiento(
    materialId: number,
    tipo: TipoMovimiento,
    cantidad: number,
  ): Promise<void> {
    let ajusteCantidad = 0;

    switch (tipo) {
      case TipoMovimiento.ENTRADA:
        ajusteCantidad = cantidad; // +cantidad
        break;
      case TipoMovimiento.SALIDA:
        ajusteCantidad = -cantidad; // -cantidad
        break;
      case TipoMovimiento.DEVOLUCION:
        ajusteCantidad = cantidad; // +cantidad
        break;
    }

    await this.materialesService.ajustarStock(materialId, ajusteCantidad);
  }

  async findAll(): Promise<MovimientoInventario[]> {
    return this.movimientosRepository.find({
      relations: ['material', 'usuario', 'instalacion', 'proveedor'],
    });
  }

  async findOne(id: number): Promise<MovimientoInventario> {
    const movimiento = await this.movimientosRepository.findOne({
      where: { movimientoId: id },
      relations: ['material', 'usuario', 'instalacion', 'proveedor'],
    });
    if (!movimiento) {
      throw new NotFoundException(`Movimiento con ID ${id} no encontrado`);
    }
    return movimiento;
  }

  async findByInstalacion(instalacionId: number): Promise<MovimientoInventario[]> {
    return this.movimientosRepository.find({
      where: { instalacionId },
      relations: ['material', 'usuario', 'instalacion', 'proveedor'],
    });
  }

  async remove(id: number): Promise<void> {
    const movimiento = await this.findOne(id);
    await this.movimientosRepository.remove(movimiento);
  }
}

