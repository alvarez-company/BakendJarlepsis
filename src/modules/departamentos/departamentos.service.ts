import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Departamento } from './departamento.entity';
import { CreateDepartamentoDto } from './dto/create-departamento.dto';
import { UpdateDepartamentoDto } from './dto/update-departamento.dto';

@Injectable()
export class DepartamentosService {
  constructor(
    @InjectRepository(Departamento)
    private departamentosRepository: Repository<Departamento>,
  ) {}

  async create(createDepartamentoDto: CreateDepartamentoDto): Promise<Departamento> {
    const departamento = this.departamentosRepository.create(createDepartamentoDto);
    return this.departamentosRepository.save(departamento);
  }

  async findAll(): Promise<Departamento[]> {
    return this.departamentosRepository.find({ relations: ['pais', 'municipios'] });
  }

  async findOne(id: number): Promise<Departamento> {
    const departamento = await this.departamentosRepository.findOne({
      where: { departamentoId: id },
      relations: ['pais', 'municipios', 'sedes'],
    });
    if (!departamento) {
      throw new NotFoundException(`Departamento con ID ${id} no encontrado`);
    }
    return departamento;
  }

  async update(id: number, updateDepartamentoDto: UpdateDepartamentoDto): Promise<Departamento> {
    const departamento = await this.findOne(id);
    Object.assign(departamento, updateDepartamentoDto);
    return this.departamentosRepository.save(departamento);
  }

  async remove(id: number): Promise<void> {
    const departamento = await this.findOne(id);
    await this.departamentosRepository.remove(departamento);
  }
}
