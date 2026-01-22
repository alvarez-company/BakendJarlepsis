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

  async create(data: DeepPartial<Proyecto>, usuarioId?: number): Promise<Proyecto> {
    // Usar QueryBuilder para tener control total sobre los campos insertados
    const insertResult = await this.proyectosRepository
      .createQueryBuilder()
      .insert()
      .into(Proyecto)
      .values({
        proyectoNombre: data.proyectoNombre,
        proyectoDescripcion: data.proyectoDescripcion || null,
        proyectoCodigo: data.proyectoCodigo || null,
        proyectoEstado: data.proyectoEstado !== undefined ? data.proyectoEstado : true,
        usuarioRegistra: usuarioId || null,
      })
      .execute();

    const proyectoId = insertResult.identifiers[0].proyectoId;

    // Usar QueryBuilder también para obtener el proyecto, evitando metadatos en caché
    const proyecto = await this.proyectosRepository
      .createQueryBuilder('proyecto')
      .select([
        'proyecto.proyectoId',
        'proyecto.proyectoNombre',
        'proyecto.proyectoDescripcion',
        'proyecto.proyectoCodigo',
        'proyecto.proyectoEstado',
        'proyecto.usuarioRegistra',
        'proyecto.fechaCreacion',
        'proyecto.fechaActualizacion',
      ])
      .leftJoinAndSelect('proyecto.items', 'items')
      .where('proyecto.proyectoId = :id', { id: proyectoId })
      .getOne();

    if (!proyecto) {
      throw new NotFoundException(`Proyecto con ID ${proyectoId} no encontrado`);
    }

    return proyecto;
  }

  async findAll(): Promise<Proyecto[]> {
    return this.proyectosRepository.find({ relations: ['items'] });
  }

  async findOne(id: number): Promise<Proyecto> {
    const proyecto = await this.proyectosRepository.findOne({
      where: { proyectoId: id },
      relations: ['items'],
    });
    if (!proyecto) throw new NotFoundException(`Proyecto con ID ${id} no encontrado`);
    return proyecto;
  }

  async update(id: number, data: any): Promise<Proyecto> {
    const proyecto = await this.findOne(id);

    // Solo actualizar campos válidos, ignorar tipoProyectoId si viene
    const updateData: any = {};
    if (data.proyectoNombre !== undefined) updateData.proyectoNombre = data.proyectoNombre;
    if (data.proyectoDescripcion !== undefined)
      updateData.proyectoDescripcion = data.proyectoDescripcion || null;
    if (data.proyectoCodigo !== undefined) updateData.proyectoCodigo = data.proyectoCodigo || null;
    if (data.proyectoEstado !== undefined) updateData.proyectoEstado = data.proyectoEstado;

    Object.assign(proyecto, updateData);
    return this.proyectosRepository.save(proyecto);
  }

  async remove(id: number): Promise<void> {
    const proyecto = await this.findOne(id);
    await this.proyectosRepository.remove(proyecto);
  }
}
