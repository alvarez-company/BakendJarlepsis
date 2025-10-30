import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bodega } from './bodega.entity';
import { CreateBodegaDto } from './dto/create-bodega.dto';
import { UpdateBodegaDto } from './dto/update-bodega.dto';
import { HasRelatedEntitiesException } from '../../common/exceptions/business.exception';

@Injectable()
export class BodegasService {
  constructor(
    @InjectRepository(Bodega)
    private bodegasRepository: Repository<Bodega>,
  ) {}

  async create(createBodegaDto: CreateBodegaDto): Promise<Bodega> {
    const bodega = this.bodegasRepository.create(createBodegaDto);
    return this.bodegasRepository.save(bodega);
  }

  async findAll(user?: any): Promise<Bodega[]> {
    const allBodegas = await this.bodegasRepository.find({ relations: ['oficina'] });
    
    // SuperAdmin ve todo
    if (user?.usuarioRol?.rolTipo === 'superadmin' || user?.role === 'superadmin') {
      return allBodegas;
    }
    
    // Admin ve solo bodegas de su oficina
    if (user?.usuarioRol?.rolTipo === 'admin' || user?.role === 'admin') {
      return allBodegas.filter(bodega => bodega.oficinaId === user.usuarioOficina);
    }
    
    // Usuario Bodega ve solo su bodega
    if (user?.usuarioRol?.rolTipo === 'bodega' || user?.role === 'bodega') {
      return allBodegas.filter(bodega => bodega.bodegaId === user.usuarioBodega);
    }
    
    return allBodegas;
  }

  async findOne(id: number): Promise<Bodega> {
    const bodega = await this.bodegasRepository.findOne({
      where: { bodegaId: id },
      relations: ['oficina', 'usuarios'],
    });
    if (!bodega) {
      throw new NotFoundException(`Bodega with ID ${id} not found`);
    }
    return bodega;
  }

  async update(id: number, updateBodegaDto: UpdateBodegaDto): Promise<Bodega> {
    const bodega = await this.findOne(id);
    Object.assign(bodega, updateBodegaDto);
    return this.bodegasRepository.save(bodega);
  }

  async remove(id: number): Promise<void> {
    const bodega = await this.findOne(id);
    
    const relations: { [key: string]: number } = {};
    
    // Contar usuarios asignados
    if (bodega.usuarios && bodega.usuarios.length > 0) {
      relations['usuarios'] = bodega.usuarios.length;
    }
    
    // Si tiene relaciones, no se puede eliminar
    if (Object.keys(relations).length > 0) {
      throw new HasRelatedEntitiesException(`bodega "${bodega.bodegaNombre}"`, relations);
    }
    
    await this.bodegasRepository.remove(bodega);
  }
}

