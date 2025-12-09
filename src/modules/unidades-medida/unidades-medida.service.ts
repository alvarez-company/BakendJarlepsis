import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { UnidadMedida } from './unidad-medida.entity';

@Injectable()
export class UnidadesMedidaService {
  constructor(
    @InjectRepository(UnidadMedida)
    private unidadesMedidaRepository: Repository<UnidadMedida>,
  ) {}

  async create(data: DeepPartial<UnidadMedida>, usuarioId: number): Promise<UnidadMedida> {
    const unidad = this.unidadesMedidaRepository.create({
      ...data,
      usuarioRegistra: usuarioId,
      unidadMedidaEstado: data.unidadMedidaEstado !== undefined ? data.unidadMedidaEstado : true,
    });
    return await this.unidadesMedidaRepository.save(unidad);
  }

  async findAll(): Promise<UnidadMedida[]> {
    return this.unidadesMedidaRepository.find({
      order: { unidadMedidaNombre: 'ASC' },
    });
  }

  async findOne(id: number): Promise<UnidadMedida> {
    const unidad = await this.unidadesMedidaRepository.findOne({ where: { unidadMedidaId: id } });
    if (!unidad) throw new NotFoundException(`Unidad de medida con ID ${id} no encontrada`);
    return unidad;
  }

  async update(id: number, data: DeepPartial<UnidadMedida>): Promise<UnidadMedida> {
    const unidad = await this.findOne(id);
    Object.assign(unidad, data);
    return this.unidadesMedidaRepository.save(unidad);
  }

  async remove(id: number): Promise<void> {
    const unidad = await this.findOne(id);
    await this.unidadesMedidaRepository.remove(unidad);
  }
}

