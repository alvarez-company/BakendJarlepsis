import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstadoMovimientoEntity } from './estado-movimiento.entity';

@Injectable()
export class EstadosMovimientoService {
  constructor(
    @InjectRepository(EstadoMovimientoEntity)
    private estadosMovimientoRepository: Repository<EstadoMovimientoEntity>,
  ) {}

  async findAll(): Promise<EstadoMovimientoEntity[]> {
    return this.estadosMovimientoRepository.find({
      where: { activo: true },
      order: { estadoNombre: 'ASC' },
    });
  }

  async findByCodigo(codigo: string): Promise<EstadoMovimientoEntity | null> {
    return this.estadosMovimientoRepository.findOne({
      where: { estadoCodigo: codigo, activo: true },
    });
  }

  async findById(id: number): Promise<EstadoMovimientoEntity | null> {
    return this.estadosMovimientoRepository.findOne({
      where: { estadoMovimientoId: id },
    });
  }
}

