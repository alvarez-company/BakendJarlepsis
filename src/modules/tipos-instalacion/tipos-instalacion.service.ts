import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { TipoInstalacion } from './tipo-instalacion.entity';

@Injectable()
export class TiposInstalacionService {
  constructor(
    @InjectRepository(TipoInstalacion)
    private tiposInstalacionRepository: Repository<TipoInstalacion>,
  ) {}

  async create(data: DeepPartial<TipoInstalacion>, usuarioId: number): Promise<TipoInstalacion> {
    const tipo = this.tiposInstalacionRepository.create({ ...data, usuarioRegistra: usuarioId });
    return await this.tiposInstalacionRepository.save(tipo);
  }

  async findAll(): Promise<TipoInstalacion[]> {
    return this.tiposInstalacionRepository.find();
  }

  async findOne(id: number): Promise<TipoInstalacion> {
    const tipo = await this.tiposInstalacionRepository.findOne({ where: { tipoInstalacionId: id } });
    if (!tipo) throw new NotFoundException(`Tipo de instalación con ID ${id} no encontrado`);
    return tipo;
  }

  async update(id: number, data: any): Promise<TipoInstalacion> {
    const tipo = await this.findOne(id);
    Object.assign(tipo, data);
    return this.tiposInstalacionRepository.save(tipo);
  }

  async remove(id: number): Promise<void> {
    const tipo = await this.findOne(id);
    await this.tiposInstalacionRepository.remove(tipo);
  }
}

