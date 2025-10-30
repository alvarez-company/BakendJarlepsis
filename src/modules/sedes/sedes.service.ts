import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sede } from './sede.entity';
import { CreateSedeDto } from './dto/create-sede.dto';
import { UpdateSedeDto } from './dto/update-sede.dto';
import { HasRelatedEntitiesException } from '../../common/exceptions/business.exception';

@Injectable()
export class SedesService {
  constructor(
    @InjectRepository(Sede)
    private sedesRepository: Repository<Sede>,
  ) {}

  async create(createSedeDto: CreateSedeDto): Promise<Sede> {
    const sede = this.sedesRepository.create(createSedeDto);
    return this.sedesRepository.save(sede);
  }

  async findAll(user?: any): Promise<Sede[]> {
    const allSedes = await this.sedesRepository.find({ relations: ['oficinas'] });
    
    // SuperAdmin ve todo
    if (user?.usuarioRol?.rolTipo === 'superadmin' || user?.role === 'superadmin') {
      return allSedes;
    }
    
    // Admin ve solo sedes de su departamento/oficina
    if (user?.usuarioRol?.rolTipo === 'admin' || user?.role === 'admin') {
      return allSedes.filter(sede => sede.departamentoId === user.usuarioSede);
    }
    
    return allSedes;
  }

  async findOne(id: number): Promise<Sede> {
    const sede = await this.sedesRepository.findOne({
      where: { sedeId: id },
      relations: ['oficinas', 'usuarios'],
    });
    if (!sede) {
      throw new NotFoundException(`Sede with ID ${id} not found`);
    }
    return sede;
  }

  async update(id: number, updateSedeDto: UpdateSedeDto): Promise<Sede> {
    const sede = await this.findOne(id);
    Object.assign(sede, updateSedeDto);
    return this.sedesRepository.save(sede);
  }

  async remove(id: number): Promise<void> {
    const sede = await this.findOne(id);
    
    const relations: { [key: string]: number } = {};
    
    // Contar oficinas asociadas
    if (sede.oficinas && sede.oficinas.length > 0) {
      relations['oficinas'] = sede.oficinas.length;
    }
    
    // Contar usuarios asignados
    if (sede.usuarios && sede.usuarios.length > 0) {
      relations['usuarios'] = sede.usuarios.length;
    }
    
    // Si tiene relaciones, no se puede eliminar
    if (Object.keys(relations).length > 0) {
      throw new HasRelatedEntitiesException(`sede "${sede.sedeNombre}"`, relations);
    }
    
    await this.sedesRepository.remove(sede);
  }
}

