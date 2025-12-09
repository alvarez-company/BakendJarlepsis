import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Municipio } from './municipio.entity';
import { CreateMunicipioDto } from './dto/create-municipio.dto';
import { UpdateMunicipioDto } from './dto/update-municipio.dto';

@Injectable()
export class MunicipiosService {
  constructor(
    @InjectRepository(Municipio)
    private municipiosRepository: Repository<Municipio>,
  ) {}

  async create(createMunicipioDto: CreateMunicipioDto): Promise<Municipio> {
    const municipio = this.municipiosRepository.create(createMunicipioDto);
    return this.municipiosRepository.save(municipio);
  }

  async findAll(): Promise<Municipio[]> {
    return this.municipiosRepository.find({ relations: ['departamento'] });
  }

  async findOne(id: number): Promise<Municipio> {
    const municipio = await this.municipiosRepository.findOne({
      where: { municipioId: id },
      relations: ['departamento'], // oficinas eliminado
    });
    if (!municipio) {
      throw new NotFoundException(`Municipio con ID ${id} no encontrado`);
    }
    return municipio;
  }

  async update(id: number, updateMunicipioDto: UpdateMunicipioDto): Promise<Municipio> {
    const municipio = await this.findOne(id);
    Object.assign(municipio, updateMunicipioDto);
    return this.municipiosRepository.save(municipio);
  }

  async remove(id: number): Promise<void> {
    const municipio = await this.findOne(id);
    await this.municipiosRepository.remove(municipio);
  }
}

