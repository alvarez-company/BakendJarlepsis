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

  async create(data: DeepPartial<ItemProyecto>, usuarioId?: number): Promise<ItemProyecto> {
    // Usar QueryBuilder para tener control total sobre los campos insertados
    const insertValues: any = {
      proyectoId: data.proyectoId,
      itemNombre: data.itemNombre,
      itemEstado: data.itemEstado !== undefined ? data.itemEstado : true,
      usuarioRegistra: usuarioId || null,
    };
    // Solo incluir itemCodigo si viene y no está vacío
    if (data.itemCodigo !== undefined && data.itemCodigo !== null && data.itemCodigo !== '') {
      insertValues.itemCodigo = data.itemCodigo;
    }
    // Solo incluir itemDescripcion si viene y no está vacío
    if (
      data.itemDescripcion !== undefined &&
      data.itemDescripcion !== null &&
      data.itemDescripcion !== ''
    ) {
      insertValues.itemDescripcion = data.itemDescripcion;
    }

    const insertResult = await this.itemsProyectoRepository
      .createQueryBuilder()
      .insert()
      .into(ItemProyecto)
      .values(insertValues)
      .execute();

    const itemProyectoId = insertResult.identifiers[0].itemProyectoId;

    // Obtener el item creado usando QueryBuilder para evitar problemas de tipo
    const item = await this.itemsProyectoRepository
      .createQueryBuilder('item')
      .select([
        'item.itemProyectoId',
        'item.proyectoId',
        'item.itemNombre',
        'item.itemCodigo',
        'item.itemDescripcion',
        'item.itemEstado',
        'item.usuarioRegistra',
        'item.fechaCreacion',
        'item.fechaActualizacion',
      ])
      .where('item.itemProyectoId = :id', { id: itemProyectoId })
      .getOne();

    if (!item) {
      throw new NotFoundException(`Item de proyecto con ID ${itemProyectoId} no encontrado`);
    }

    return item;
  }

  async findAll(): Promise<ItemProyecto[]> {
    return this.itemsProyectoRepository.find({ relations: ['proyecto'] });
  }

  async findByProyecto(proyectoId: number): Promise<ItemProyecto[]> {
    return this.itemsProyectoRepository.find({
      where: { proyectoId },
    });
  }

  async findOne(id: number): Promise<ItemProyecto> {
    const item = await this.itemsProyectoRepository.findOne({
      where: { itemProyectoId: id },
      relations: ['proyecto'],
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
