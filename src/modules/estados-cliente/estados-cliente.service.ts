import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstadoClienteEntity } from './estado-cliente.entity';

@Injectable()
export class EstadosClienteService {
  constructor(
    @InjectRepository(EstadoClienteEntity)
    private estadosClienteRepository: Repository<EstadoClienteEntity>,
  ) {}

  async findAll(): Promise<EstadoClienteEntity[]> {
    return this.estadosClienteRepository.find({
      where: { activo: true },
      order: { estadoNombre: 'ASC' },
    });
  }

  async findByCodigo(codigo: string): Promise<EstadoClienteEntity | null> {
    return this.estadosClienteRepository.findOne({
      where: { estadoCodigo: codigo, activo: true },
    });
  }

  async findById(id: number): Promise<EstadoClienteEntity | null> {
    return this.estadosClienteRepository.findOne({
      where: { estadoClienteId: id },
    });
  }
}

