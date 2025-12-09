import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AsignacionTecnico } from './asignacion-tecnico.entity';
import { CreateAsignacionTecnicoDto } from './dto/create-asignacion-tecnico.dto';

@Injectable()
export class AsignacionesTecnicosService {
  constructor(
    @InjectRepository(AsignacionTecnico)
    private asignacionesRepository: Repository<AsignacionTecnico>,
  ) {}

  private async generarCodigoAsignacion(): Promise<string> {
    // Buscar el último código de asignación con formato corto (ASIG-N)
    // Ordenar por ID descendente para obtener el más reciente
    const ultimaAsignacion = await this.asignacionesRepository
      .createQueryBuilder('asignacion')
      .where('asignacion.asignacionCodigo IS NOT NULL')
      .andWhere('asignacion.asignacionCodigo REGEXP :pattern', { pattern: '^ASIG-[0-9]+$' })
      .orderBy('asignacion.asignacionTecnicoId', 'DESC')
      .limit(1)
      .getOne();

    let siguienteNumero = 1;
    if (ultimaAsignacion?.asignacionCodigo) {
      const match = ultimaAsignacion.asignacionCodigo.match(/^ASIG-(\d+)$/);
      if (match && match[1]) {
        siguienteNumero = parseInt(match[1], 10) + 1;
      }
    }

    return `ASIG-${siguienteNumero}`;
  }

  async create(createDto: CreateAsignacionTecnicoDto): Promise<AsignacionTecnico> {
    // Si no se proporciona código, generar uno automáticamente
    if (!createDto.asignacionCodigo) {
      createDto.asignacionCodigo = await this.generarCodigoAsignacion();
    }
    const asignacion = this.asignacionesRepository.create(createDto);
    return await this.asignacionesRepository.save(asignacion);
  }

  async findAll(): Promise<AsignacionTecnico[]> {
    return this.asignacionesRepository.find({
      relations: ['usuario', 'inventario', 'inventario.bodega', 'inventario.bodega.sede', 'usuarioAsignador'],
      order: { fechaCreacion: 'DESC' },
    });
  }

  async findOne(id: number): Promise<AsignacionTecnico> {
    const asignacion = await this.asignacionesRepository.findOne({
      where: { asignacionTecnicoId: id },
      relations: ['usuario', 'inventario', 'inventario.bodega', 'inventario.bodega.sede', 'usuarioAsignador'],
    });

    if (!asignacion) {
      throw new NotFoundException(`Asignación con ID ${id} no encontrada`);
    }

    return asignacion;
  }

  async findByUsuario(usuarioId: number): Promise<AsignacionTecnico[]> {
    return this.asignacionesRepository.find({
      where: { usuarioId },
      relations: ['usuario', 'inventario', 'inventario.bodega', 'inventario.bodega.sede', 'usuarioAsignador'],
      order: { fechaCreacion: 'DESC' },
    });
  }

  async update(id: number, updateDto: Partial<AsignacionTecnico>): Promise<AsignacionTecnico> {
    const asignacion = await this.findOne(id);
    Object.assign(asignacion, updateDto);
    return await this.asignacionesRepository.save(asignacion);
  }

  async aprobar(id: number): Promise<AsignacionTecnico> {
    return this.update(id, { asignacionEstado: 'aprobada' });
  }

  async rechazar(id: number): Promise<AsignacionTecnico> {
    return this.update(id, { asignacionEstado: 'rechazada' });
  }

  async remove(id: number): Promise<void> {
    const asignacion = await this.findOne(id);
    await this.asignacionesRepository.remove(asignacion);
  }
}

