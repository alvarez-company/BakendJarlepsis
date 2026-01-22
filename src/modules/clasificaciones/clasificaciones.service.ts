import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Clasificacion } from './clasificacion.entity';

@Injectable()
export class ClasificacionesService {
  constructor(
    @InjectRepository(Clasificacion)
    private clasificacionesRepository: Repository<Clasificacion>,
  ) {}

  async create(data: DeepPartial<Clasificacion>, usuarioId: number): Promise<Clasificacion> {
    const clasificacion = this.clasificacionesRepository.create({
      ...data,
      usuarioRegistra: usuarioId,
      clasificacionEstado: data.clasificacionEstado !== undefined ? data.clasificacionEstado : true,
    });
    return await this.clasificacionesRepository.save(clasificacion);
  }

  async findAll(): Promise<Clasificacion[]> {
    return this.clasificacionesRepository.find({
      order: { clasificacionNombre: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Clasificacion> {
    const clasificacion = await this.clasificacionesRepository.findOne({
      where: { clasificacionId: id },
    });
    if (!clasificacion) throw new NotFoundException(`Clasificación con ID ${id} no encontrada`);
    return clasificacion;
  }

  async update(id: number, data: DeepPartial<Clasificacion>): Promise<Clasificacion> {
    const clasificacion = await this.findOne(id);
    Object.assign(clasificacion, data);
    return this.clasificacionesRepository.save(clasificacion);
  }

  async remove(id: number): Promise<void> {
    const clasificacion = await this.findOne(id);
    await this.clasificacionesRepository.remove(clasificacion);
  }
}
