import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Oficina } from './oficina.entity';
import { CreateOficinaDto } from './dto/create-oficina.dto';
import { UpdateOficinaDto } from './dto/update-oficina.dto';
import { HasRelatedEntitiesException } from '../../common/exceptions/business.exception';

@Injectable()
export class OficinasService {
  constructor(
    @InjectRepository(Oficina)
    private officesRepository: Repository<Oficina>,
  ) {}

  async create(createOficinaDto: CreateOficinaDto): Promise<Oficina> {
    const oficina = this.officesRepository.create(createOficinaDto);
    return this.officesRepository.save(oficina);
  }

  async findAll(user?: any): Promise<Oficina[]> {
    const allOficinas = await this.officesRepository.find({ relations: ['sede', 'bodegas'] });
    
    // SuperAdmin ve todo
    if (user?.usuarioRol?.rolTipo === 'superadmin' || user?.role === 'superadmin') {
      return allOficinas;
    }
    
    // Admin ve solo su oficina y bodegas asociadas
    if (user?.usuarioRol?.rolTipo === 'admin' || user?.role === 'admin') {
      return allOficinas.filter(oficina => oficina.oficinaId === user.usuarioOficina);
    }
    
    return allOficinas;
  }

  async findOne(id: number): Promise<Oficina> {
    const oficina = await this.officesRepository.findOne({
      where: { oficinaId: id },
      relations: ['sede', 'bodegas', 'usuarios'],
    });
    if (!oficina) {
      throw new NotFoundException(`Oficina with ID ${id} not found`);
    }
    return oficina;
  }

  async update(id: number, updateOficinaDto: UpdateOficinaDto): Promise<Oficina> {
    const oficina = await this.findOne(id);
    Object.assign(oficina, updateOficinaDto);
    return this.officesRepository.save(oficina);
  }

  async remove(id: number): Promise<void> {
    const oficina = await this.findOne(id);
    
    const relations: { [key: string]: number } = {};
    
    // Contar bodegas asociadas
    if (oficina.bodegas && oficina.bodegas.length > 0) {
      relations['bodegas'] = oficina.bodegas.length;
    }
    
    // Contar usuarios asignados
    if (oficina.usuarios && oficina.usuarios.length > 0) {
      relations['usuarios'] = oficina.usuarios.length;
    }
    
    // Si tiene relaciones, no se puede eliminar
    if (Object.keys(relations).length > 0) {
      throw new HasRelatedEntitiesException(`oficina "${oficina.oficinaNombre}"`, relations);
    }
    
    await this.officesRepository.remove(oficina);
  }
}

