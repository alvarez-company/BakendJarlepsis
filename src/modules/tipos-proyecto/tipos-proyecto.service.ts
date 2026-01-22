import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { TipoProyecto } from './tipo-proyecto.entity';

@Injectable()
export class TiposProyectoService {
  constructor(
    @InjectRepository(TipoProyecto)
    private tiposProyectoRepository: Repository<TipoProyecto>,
  ) {}

  async create(data: DeepPartial<TipoProyecto>): Promise<TipoProyecto> {
    const tipo = this.tiposProyectoRepository.create(data);
    return await this.tiposProyectoRepository.save(tipo);
  }

  async findAll(): Promise<TipoProyecto[]> {
    return this.tiposProyectoRepository.find();
  }

  async findOne(id: number): Promise<TipoProyecto> {
    const tipo = await this.tiposProyectoRepository.findOne({ where: { tipoProyectoId: id } });
    if (!tipo) throw new NotFoundException(`Tipo de proyecto con ID ${id} no encontrado`);
    return tipo;
  }

  async update(id: number, data: any): Promise<TipoProyecto> {
    const tipo = await this.findOne(id);
    Object.assign(tipo, data);
    return this.tiposProyectoRepository.save(tipo);
  }

  async remove(id: number): Promise<void> {
    const tipo = await this.findOne(id);
    await this.tiposProyectoRepository.remove(tipo);
  }
}
