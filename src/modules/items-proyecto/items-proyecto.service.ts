import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { ItemProyecto } from './item-proyecto.entity';

@Injectable()
export class ItemsProyectoService {
  constructor(
    @InjectRepository(ItemProyecto)
    private itemsProyectoRepository: Repository<ItemProyecto>,
  ) {}

  async create(data: DeepPartial<ItemProyecto>): Promise<ItemProyecto> {
    const item = this.itemsProyectoRepository.create(data);
    return await this.itemsProyectoRepository.save(item);
  }

  async findAll(): Promise<ItemProyecto[]> {
    return this.itemsProyectoRepository.find({ relations: ['proyecto', 'material'] });
  }

  async findByProyecto(proyectoId: number): Promise<ItemProyecto[]> {
    return this.itemsProyectoRepository.find({
      where: { proyectoId },
      relations: ['material'],
    });
  }

  async findOne(id: number): Promise<ItemProyecto> {
    const item = await this.itemsProyectoRepository.findOne({
      where: { itemProyectoId: id },
      relations: ['proyecto', 'material'],
    });
    if (!item) throw new NotFoundException(`Item de proyecto con ID ${id} no encontrado`);
    return item;
  }

  async update(id: number, data: any): Promise<ItemProyecto> {
    const item = await this.findOne(id);
    Object.assign(item, data);
    return this.itemsProyectoRepository.save(item);
  }

  async remove(id: number): Promise<void> {
    const item = await this.findOne(id);
    await this.itemsProyectoRepository.remove(item);
  }
}

