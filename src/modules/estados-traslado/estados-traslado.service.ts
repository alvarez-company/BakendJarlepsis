import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstadoTrasladoEntity } from './estado-traslado.entity';

@Injectable()
export class EstadosTrasladoService {
  constructor(
    @InjectRepository(EstadoTrasladoEntity)
    private estadosTrasladoRepository: Repository<EstadoTrasladoEntity>,
  ) {}

  async findAll(): Promise<EstadoTrasladoEntity[]> {
    return this.estadosTrasladoRepository.find({
      where: { activo: true },
      order: { estadoNombre: 'ASC' },
    });
  }

  async findByCodigo(codigo: string): Promise<EstadoTrasladoEntity | null> {
    return this.estadosTrasladoRepository.findOne({
      where: { estadoCodigo: codigo, activo: true },
    });
  }

  async findById(id: number): Promise<EstadoTrasladoEntity | null> {
    return this.estadosTrasladoRepository.findOne({
      where: { estadoTrasladoId: id },
    });
  }
}

