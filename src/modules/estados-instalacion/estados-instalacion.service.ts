import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstadoInstalacionEntity } from './estado-instalacion.entity';

@Injectable()
export class EstadosInstalacionService {
  constructor(
    @InjectRepository(EstadoInstalacionEntity)
    private estadosInstalacionRepository: Repository<EstadoInstalacionEntity>,
  ) {}

  async findAll(): Promise<EstadoInstalacionEntity[]> {
    return this.estadosInstalacionRepository.find({
      where: { activo: true },
      order: { estadoNombre: 'ASC' },
    });
  }

  async findByCodigo(codigo: string): Promise<EstadoInstalacionEntity | null> {
    return this.estadosInstalacionRepository.findOne({
      where: { estadoCodigo: codigo, activo: true },
    });
  }

  async findById(id: number): Promise<EstadoInstalacionEntity | null> {
    return this.estadosInstalacionRepository.findOne({
      where: { estadoInstalacionId: id },
    });
  }
}

