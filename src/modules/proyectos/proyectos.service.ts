import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Proyecto } from './proyecto.entity';

@Injectable()
export class ProyectosService {
  constructor(
    @InjectRepository(Proyecto)
    private proyectosRepository: Repository<Proyecto>,
  ) {}

  async create(data: DeepPartial<Proyecto>): Promise<Proyecto> {
    const proyecto = this.proyectosRepository.create(data);
    return await this.proyectosRepository.save(proyecto);
  }

  async findAll(): Promise<Proyecto[]> {
    return this.proyectosRepository.find({ relations: ['tipoProyecto', 'items'] });
  }

  async findOne(id: number): Promise<Proyecto> {
    const proyecto = await this.proyectosRepository.findOne({
      where: { proyectoId: id },
      relations: ['tipoProyecto', 'items'],
    });
    if (!proyecto) throw new NotFoundException(`Proyecto con ID ${id} no encontrado`);
    return proyecto;
  }

  async update(id: number, data: any): Promise<Proyecto> {
    const proyecto = await this.findOne(id);
    Object.assign(proyecto, data);
    return this.proyectosRepository.save(proyecto);
  }

  async remove(id: number): Promise<void> {
    const proyecto = await this.findOne(id);
    await this.proyectosRepository.remove(proyecto);
  }
}

