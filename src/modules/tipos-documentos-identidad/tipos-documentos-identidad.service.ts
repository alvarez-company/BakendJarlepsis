import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoDocumentoIdentidad } from './tipo-documento-identidad.entity';
import { CreateTipoDocumentoIdentidadDto } from './dto/create-tipo-documento-identidad.dto';
import { UpdateTipoDocumentoIdentidadDto } from './dto/update-tipo-documento-identidad.dto';

@Injectable()
export class TiposDocumentosIdentidadService {
  constructor(
    @InjectRepository(TipoDocumentoIdentidad)
    private tiposDocumentosRepository: Repository<TipoDocumentoIdentidad>,
  ) {}

  async create(createDto: CreateTipoDocumentoIdentidadDto): Promise<TipoDocumentoIdentidad> {
    const tipoDocumento = this.tiposDocumentosRepository.create(createDto);
    return this.tiposDocumentosRepository.save(tipoDocumento);
  }

  async findAll(): Promise<TipoDocumentoIdentidad[]> {
    return this.tiposDocumentosRepository.find({
      where: { tipoDocumentoEstado: true },
      order: { tipoDocumentoNombre: 'ASC' },
    });
  }

  async findOne(id: number): Promise<TipoDocumentoIdentidad> {
    const tipoDocumento = await this.tiposDocumentosRepository.findOne({
      where: { tipoDocumentoId: id },
    });
    if (!tipoDocumento) {
      throw new NotFoundException(`Tipo de documento con ID ${id} no encontrado`);
    }
    return tipoDocumento;
  }

  async findByCodigo(codigo: string): Promise<TipoDocumentoIdentidad> {
    const tipoDocumento = await this.tiposDocumentosRepository.findOne({
      where: { tipoDocumentoCodigo: codigo },
    });
    if (!tipoDocumento) {
      throw new NotFoundException(`Tipo de documento con código ${codigo} no encontrado`);
    }
    return tipoDocumento;
  }

  async update(id: number, updateDto: UpdateTipoDocumentoIdentidadDto): Promise<TipoDocumentoIdentidad> {
    const tipoDocumento = await this.findOne(id);
    Object.assign(tipoDocumento, updateDto);
    return this.tiposDocumentosRepository.save(tipoDocumento);
  }

  async remove(id: number): Promise<void> {
    const tipoDocumento = await this.findOne(id);
    await this.tiposDocumentosRepository.remove(tipoDocumento);
  }
}

